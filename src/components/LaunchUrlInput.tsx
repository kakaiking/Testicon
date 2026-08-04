"use client";

import { LAUNCH_URL_PREFIX, stripLaunchUrlPrefix } from "@/lib/launch-url";

type Props = {
  value: string;
  onChange: (fullUrl: string) => void;
  required?: boolean;
};

export default function LaunchUrlInput({ value, onChange, required }: Props) {
  return (
    <div className="input-with-prefix">
      <span className="input-prefix" aria-hidden>
        {LAUNCH_URL_PREFIX}
      </span>
      <input
        className="input-field input-field-prefixed"
        value={stripLaunchUrlPrefix(value)}
        onChange={(e) => {
          const hostPath = stripLaunchUrlPrefix(e.target.value);
          onChange(hostPath ? `${LAUNCH_URL_PREFIX}${hostPath}` : "");
        }}
        required={required}
        placeholder="app.example.com"
        inputMode="url"
        autoComplete="url"
        spellCheck={false}
      />
    </div>
  );
}
