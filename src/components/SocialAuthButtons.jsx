import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";

const MicrosoftIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3h8v8H3V3z" fill="#F25022" />
    <path d="M13 3h8v8h-8V3z" fill="#7FBA00" />
    <path d="M3 13h8v8H3v-8z" fill="#00A4EF" />
    <path d="M13 13h8v8h-8v-8z" fill="#FFB900" />
  </svg>
);

const FacebookIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" fill="#1877F2" />
  </svg>
);

const AppleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.05 12.94c.03 3.27 2.87 4.36 2.9 4.38-.02.07-.45 1.55-1.5 3.08-.9 1.32-1.83 2.63-3.3 2.66-1.44.03-1.9-.86-3.55-.86s-2.16.83-3.52.89c-1.42.05-2.5-1.44-3.41-2.76-1.85-2.7-3.27-7.63-1.36-10.97.94-1.64 2.62-2.68 4.44-2.71 1.38-.03 2.68.93 3.53.93.85 0 2.44-1.15 4.12-.98.7.03 2.67.28 3.93 2.12-.1.06-2.35 1.37-2.32 4.1M14.3 5.39c.75-.91 1.26-2.17 1.12-3.43-1.08.04-2.4.72-3.18 1.62-.7.8-1.31 2.09-1.15 3.32 1.21.09 2.45-.61 3.21-1.51" fill="#000" />
  </svg>
);

const PROVIDERS = [
  { key: "google", label: "Google", Icon: GoogleIcon },
  { key: "microsoft", label: "Microsoft", Icon: MicrosoftIcon },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "apple", label: "Apple", Icon: AppleIcon },
];

export default function SocialAuthButtons({ returnTo }) {
  const handle = (provider) => () => base44.auth.loginWithProvider(provider, returnTo);

  return (
    <div className="space-y-3 mb-6">
      {PROVIDERS.map(({ key, label, Icon }) => (
        <Button
          key={key}
          type="button"
          variant="outline"
          className="w-full h-12 text-sm font-medium"
          onClick={handle(key)}
        >
          <Icon className="w-5 h-5 mr-2" />
          Continue with {label}
        </Button>
      ))}
    </div>
  );
}