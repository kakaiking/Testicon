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
  };

  var contextCallbacks = [];
  var logoutCallbacks = [];
  var latestContext = null;
  var embedded = false;

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
