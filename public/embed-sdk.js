/**
 * Testicon Embed SDK — drop into any app loaded inside the Testicon iframe shell.
 *
 * Usage:
 *   <script src="https://your-testicon-host/embed-sdk.js"></script>
 *   <script>
 *     TesticonEmbed.onContext(function (ctx) {
 *       // ctx.tester { id, email, name }
 *       // ctx.token — verify server-side via POST /api/embed/verify
 *       // ctx.app { id, name }
 *       signInTester(ctx.tester);
 *     });
 *     TesticonEmbed.onLogoutRequest(function () {
 *       signOut();
 *     });
 *   </script>
 */
(function (global) {
  "use strict";

  var VERSION = 1;
  var MSG = {
    READY: "testicon:ready",
    CONTEXT: "testicon:context",
    LOGOUT: "testicon:logout",
    REQUEST_CONTEXT: "testicon:request-context",
    REQUEST_SCREENSHOT: "testicon:request-screenshot",
    SCREENSHOT: "testicon:screenshot",
  };

  var contextCallbacks = [];
  var logoutCallbacks = [];
  var latestContext = null;
  var embedded = false;
  var modernScreenshotPromise = null;

  function getSdkBaseUrl() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src && src.indexOf("embed-sdk.js") !== -1) {
        return src.replace(/embed-sdk\.js(\?.*)?$/, "");
      }
    }
    return "";
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (resolve) {
        setTimeout(function () {
          resolve(null);
        }, ms);
      }),
    ]);
  }

  function loadModernScreenshot() {
    if (global.modernScreenshot) return Promise.resolve(global.modernScreenshot);
    if (modernScreenshotPromise) return modernScreenshotPromise;

    modernScreenshotPromise = withTimeout(
      new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.src = getSdkBaseUrl() + "modern-screenshot.js?v=2";
        script.onload = function () {
          if (global.modernScreenshot) resolve(global.modernScreenshot);
          else reject(new Error("modern-screenshot failed to load"));
        };
        script.onerror = function () {
          reject(new Error("modern-screenshot failed to load"));
        };
        document.head.appendChild(script);
      }),
      8000
    ).then(function (result) {
      if (!result) throw new Error("modern-screenshot load timed out");
      return result;
    });

    return modernScreenshotPromise;
  }

  function isVisible(el) {
    if (!el) return false;
    var view = el.ownerDocument && el.ownerDocument.defaultView;
    if (!view) return false;
    var style = view.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    var rect = el.getBoundingClientRect();
    return rect.width >= 10 && rect.height >= 10;
  }

  function iframeHasContent(iframe) {
    try {
      var doc = iframe.contentDocument;
      if (!doc || !doc.body) return false;
      if (doc.body.childElementCount === 0) return false;
      var text = (doc.body.textContent || "").trim();
      if (!text && !doc.body.querySelector("img, canvas, svg, video, button, input, form, table")) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function iframeArea(el) {
    var r = el.getBoundingClientRect();
    return r.width * r.height;
  }

  function findCaptureRoot(doc) {
    var iframes = Array.prototype.slice.call(doc.querySelectorAll("iframe"))
      .filter(function (iframe) {
        return isVisible(iframe) && iframeHasContent(iframe);
      })
      .sort(function (a, b) {
        return iframeArea(b) - iframeArea(a);
      });

    for (var i = 0; i < iframes.length; i++) {
      try {
        return findCaptureRoot(iframes[i].contentDocument);
      } catch (e) {
        /* cross-origin */
      }
    }

    return doc.documentElement;
  }

  function shouldIgnoreNode(node) {
    if (!node || node.nodeType !== 1) return false;
    var cls = node.className;
    if (typeof cls === "string") {
      if (cls.indexOf("glow-bg") !== -1 || cls.indexOf("blob") !== -1) return true;
    }
    return false;
  }

  function captureScreenshot() {
    return loadModernScreenshot().then(function (ms) {
      var root = findCaptureRoot(document);
      var scale = Math.min(global.devicePixelRatio || 1, 1.5);
      return ms.domToJpeg(root, {
        backgroundColor: "#0a0f1d",
        scale: scale,
        quality: 0.85,
        timeout: 15000,
        filter: function (node) {
          return !shouldIgnoreNode(node);
        },
      });
    });
  }

  function forwardScreenshotRequest(data) {
    document.querySelectorAll("iframe").forEach(function (iframe) {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(data, "*");
        }
      } catch (e) {
        /* ignore */
      }
    });
  }

  function captureScreenshotWithTimeout() {
    return withTimeout(captureScreenshot(), 15000).then(function (result) {
      if (result) return result;
      throw new Error("Screenshot capture timed out");
    });
  }

  try {
    embedded = global.self !== global.top;
  } catch (e) {
    embedded = true;
  }

  function isTesticonMessage(data) {
    return data && typeof data.type === "string" && data.type.indexOf("testicon:") === 0;
  }

  function emitContext(payload) {
    latestContext = payload;
    for (var i = 0; i < contextCallbacks.length; i++) {
      try {
        contextCallbacks[i](payload);
      } catch (err) {
        console.error("[TesticonEmbed] context handler error:", err);
      }
    }
  }

  function handleMessage(event) {
    var data = event.data;
    if (!isTesticonMessage(data)) return;

    if (data.type === MSG.CONTEXT && data.payload) {
      emitContext(data.payload);
    }

    if (data.type === MSG.REQUEST_SCREENSHOT) {
      var requestId = data.requestId;

      forwardScreenshotRequest(data);

      captureScreenshotWithTimeout()
        .then(function (dataUrl) {
          post(MSG.SCREENSHOT, { requestId: requestId, payload: { dataUrl: dataUrl } });
        })
        .catch(function (err) {
          var msg = err && err.message ? err.message : "Screenshot capture failed";
          post(MSG.SCREENSHOT, {
            requestId: requestId,
            payload: { error: msg },
          });
        });
    }
  }

  function post(type, extra) {
    if (!embedded || !global.parent) return;
    var msg = { type: type, version: VERSION };
    if (extra) {
      for (var key in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, key)) msg[key] = extra[key];
      }
    }
    global.parent.postMessage(msg, "*");
  }

  global.addEventListener("message", handleMessage);

  var api = {
    VERSION: VERSION,
    isEmbedded: function () {
      return embedded;
    },
    getContext: function () {
      return latestContext;
    },
    onContext: function (fn) {
      if (typeof fn === "function") contextCallbacks.push(fn);
      if (latestContext) fn(latestContext);
      return api;
    },
    onLogoutRequest: function (fn) {
      if (typeof fn === "function") logoutCallbacks.push(fn);
      return api;
    },
    notifyReady: function () {
      post(MSG.READY);
      return api;
    },
    notifyLogout: function () {
      post(MSG.LOGOUT);
      latestContext = null;
      for (var i = 0; i < logoutCallbacks.length; i++) {
        try {
          logoutCallbacks[i]();
        } catch (err) {
          console.error("[TesticonEmbed] logout handler error:", err);
        }
      }
      return api;
    },
    requestContext: function () {
      post(MSG.REQUEST_CONTEXT);
      return api;
    },
  };

  global.TesticonEmbed = api;

  if (embedded) {
    if (global.document.readyState === "loading") {
      global.document.addEventListener("DOMContentLoaded", function () {
        api.notifyReady();
      });
    } else {
      api.notifyReady();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
