'use client';

import { MaintenancePage } from '@agora-cms/ui';

export interface SiteStatusPageProps {
  headline?: string;
  message?: string;
  showCountdown?: boolean;
  countdownTarget?: string | null;
  showNewsletter?: boolean;
  socialLinks?: { platform: string; url: string }[];
  backgroundColor?: string;
}

export function SiteStatusPage(props: SiteStatusPageProps) {
  return <MaintenancePage {...props} />;
}
