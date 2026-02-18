export interface CertificateTemplate {
  id: string;
  name: string;
  type: 'certificate' | 'badge';
  orientation: 'landscape' | 'portrait';
  /** Width in inches — used for badge type to override standard A4 sizing */
  width?: number;
  /** Height in inches */
  height?: number;

  // Colors
  backgroundColor: string;
  primaryColor: string;
  textColor: string;
  borderColor: string;
  accentColor: string;

  // Images (MediaPicker URLs)
  logoImage: string;
  backgroundImage: string;
  signatureImage: string;

  // Toggles
  showLogo: boolean;
  showBorder: boolean;
  showInstructor: boolean;
  showDate: boolean;
  showVerificationCode: boolean;
  showSignatureImage: boolean;

  // Typography
  titleText: string;
  subtitleText: string;
  completionText: string;
  nameFontSize: number;
  courseTitleFontSize: number;

  // Border
  borderStyle: 'single' | 'double' | 'none';
  borderWidth: number;

  // Custom
  organizationName: string;
  customFooterText: string;

  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CERTIFICATE_TEMPLATE: CertificateTemplate = {
  id: '',
  name: 'Default Certificate',
  type: 'certificate',
  orientation: 'landscape',

  backgroundColor: '#ffffff',
  primaryColor: '#1e40af',
  textColor: '#111827',
  borderColor: '#3b82f6',
  accentColor: '#4b5563',

  logoImage: '',
  backgroundImage: '',
  signatureImage: '',

  showLogo: false,
  showBorder: true,
  showInstructor: true,
  showDate: true,
  showVerificationCode: true,
  showSignatureImage: false,

  titleText: 'Certificate of Completion',
  subtitleText: 'This is to certify that',
  completionText: 'has successfully completed',
  nameFontSize: 36,
  courseTitleFontSize: 28,

  borderStyle: 'double',
  borderWidth: 5,

  organizationName: '',
  customFooterText: '',

  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
