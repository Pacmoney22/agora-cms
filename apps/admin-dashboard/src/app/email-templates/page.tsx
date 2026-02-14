'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailTemplatesApi } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { RichTextEditor } from '@/components/RichTextEditor';

// ── Types ──

interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  description: string;
  status: 'active' | 'draft';
  isDefault: boolean;
  mergeTags: MergeTag[];
  updatedAt: string;
}

interface MergeTag {
  tag: string;
  label: string;
  example: string;
}

// ── Template Definitions ──

interface TemplateDefinition {
  name: string;
  slug: string;
  category: string;
  description: string;
  trigger: string;
  mergeTags: MergeTag[];
  defaultSubject: string;
  defaultHtml: string;
}

const CATEGORIES = [
  { key: 'authentication', label: 'Authentication', color: 'bg-blue-100 text-blue-700' },
  { key: 'events', label: 'Events', color: 'bg-purple-100 text-purple-700' },
  { key: 'commerce', label: 'Commerce', color: 'bg-green-100 text-green-700' },
  { key: 'learning', label: 'Learning', color: 'bg-indigo-100 text-indigo-700' },
  { key: 'notifications', label: 'Notifications', color: 'bg-amber-100 text-amber-700' },
];

const COMMON_TAGS: MergeTag[] = [
  { tag: '{{site_name}}', label: 'Site Name', example: 'My Website' },
  { tag: '{{site_url}}', label: 'Site URL', example: 'https://example.com' },
  { tag: '{{current_year}}', label: 'Current Year', example: '2026' },
  { tag: '{{support_email}}', label: 'Support Email', example: 'support@example.com' },
];

const TRIGGER_EVENTS = [
  { value: '', label: 'None (manual only)' },
  // Authentication
  { value: 'user.registered', label: 'User Registered', category: 'authentication' },
  { value: 'user.email_verification', label: 'Email Verification Requested', category: 'authentication' },
  { value: 'user.password_reset', label: 'Password Reset Requested', category: 'authentication' },
  { value: 'user.password_forgotten', label: 'Password Forgotten', category: 'authentication' },
  { value: 'user.password_changed', label: 'Password Changed', category: 'authentication' },
  // Events
  { value: 'event.registration_confirmed', label: 'Event Registration Confirmed', category: 'events' },
  { value: 'event.reminder', label: 'Event Reminder', category: 'events' },
  { value: 'event.cancelled', label: 'Event Cancelled', category: 'events' },
  { value: 'event.updated', label: 'Event Details Updated', category: 'events' },
  // Commerce
  { value: 'order.confirmed', label: 'Order Confirmed', category: 'commerce' },
  { value: 'order.shipped', label: 'Order Shipped', category: 'commerce' },
  { value: 'cart.abandoned', label: 'Cart Abandoned', category: 'commerce' },
  { value: 'return.initiated', label: 'Return Initiated', category: 'commerce' },
  { value: 'refund.processed', label: 'Refund Processed', category: 'commerce' },
  { value: 'payment.failed', label: 'Payment Failed', category: 'commerce' },
  // Learning
  { value: 'course.enrolled', label: 'Course Enrolled', category: 'learning' },
  { value: 'course.completed', label: 'Course Completed', category: 'learning' },
  { value: 'lesson.published', label: 'New Lesson Published', category: 'learning' },
  { value: 'assignment.due_reminder', label: 'Assignment Due Reminder', category: 'learning' },
  { value: 'grade.posted', label: 'Grade Posted', category: 'learning' },
  { value: 'course.expiring', label: 'Course Access Expiring', category: 'learning' },
  // Notifications
  { value: 'form.submitted', label: 'Form Submitted', category: 'notifications' },
  { value: 'newsletter.subscribed', label: 'Newsletter Subscribed', category: 'notifications' },
  { value: 'comment.created', label: 'New Comment', category: 'notifications' },
  { value: 'review.created', label: 'New Review', category: 'notifications' },
];

const TEMPLATE_DEFS: TemplateDefinition[] = [
  // Authentication
  {
    name: 'Welcome / Registration', slug: 'user_registration', category: 'authentication',
    description: 'Sent when a new user creates an account',
    trigger: 'user.registered',
    mergeTags: [
      { tag: '{{user_name}}', label: 'User Name', example: 'John Smith' },
      { tag: '{{user_email}}', label: 'User Email', example: 'john@example.com' },
      { tag: '{{verification_link}}', label: 'Verification Link', example: 'https://example.com/verify?token=abc' },
      { tag: '{{login_url}}', label: 'Login URL', example: 'https://example.com/login' },
    ],
    defaultSubject: 'Welcome to {{site_name}}!',
    defaultHtml: `<h1>Welcome, {{user_name}}!</h1>\n<p>Thank you for creating an account at {{site_name}}.</p>\n<p>Please verify your email address by clicking the link below:</p>\n<p><a href="{{verification_link}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Verify Email</a></p>\n<p>If you didn't create this account, you can safely ignore this email.</p>`,
  },
  {
    name: 'Email Verification', slug: 'email_verification', category: 'authentication',
    description: 'Sent when a user needs to verify their email',
    trigger: 'user.email_verification',
    mergeTags: [
      { tag: '{{user_name}}', label: 'User Name', example: 'John Smith' },
      { tag: '{{verification_link}}', label: 'Verification Link', example: 'https://example.com/verify?token=abc' },
      { tag: '{{expiry_hours}}', label: 'Link Expiry (hours)', example: '24' },
    ],
    defaultSubject: 'Verify your email for {{site_name}}',
    defaultHtml: `<h1>Verify Your Email</h1>\n<p>Hi {{user_name}},</p>\n<p>Click the link below to verify your email address. This link expires in {{expiry_hours}} hours.</p>\n<p><a href="{{verification_link}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Verify Email</a></p>`,
  },
  {
    name: 'Password Reset', slug: 'password_reset', category: 'authentication',
    description: 'Sent when a user requests a password reset',
    trigger: 'user.password_reset',
    mergeTags: [
      { tag: '{{user_name}}', label: 'User Name', example: 'John Smith' },
      { tag: '{{reset_link}}', label: 'Reset Link', example: 'https://example.com/reset?token=abc' },
      { tag: '{{expiry_minutes}}', label: 'Link Expiry (minutes)', example: '60' },
      { tag: '{{ip_address}}', label: 'Request IP', example: '192.168.1.1' },
    ],
    defaultSubject: 'Reset your {{site_name}} password',
    defaultHtml: `<h1>Password Reset Request</h1>\n<p>Hi {{user_name}},</p>\n<p>We received a request to reset your password. Click the link below to set a new password:</p>\n<p><a href="{{reset_link}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Reset Password</a></p>\n<p>This link expires in {{expiry_minutes}} minutes. If you didn't request this, ignore this email.</p>`,
  },
  {
    name: 'Forgotten Password', slug: 'forgotten_password', category: 'authentication',
    description: 'Reminder sent for forgotten password recovery',
    trigger: 'user.password_forgotten',
    mergeTags: [
      { tag: '{{user_name}}', label: 'User Name', example: 'John Smith' },
      { tag: '{{reset_link}}', label: 'Reset Link', example: 'https://example.com/reset?token=abc' },
    ],
    defaultSubject: 'Forgot your password? Here\'s how to reset it',
    defaultHtml: `<h1>Forgot Your Password?</h1>\n<p>Hi {{user_name}},</p>\n<p>No worries! Click the button below to reset your password:</p>\n<p><a href="{{reset_link}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Reset My Password</a></p>\n<p>If you remember your password, you can safely ignore this email.</p>`,
  },
  {
    name: 'Password Changed', slug: 'password_changed', category: 'authentication',
    description: 'Confirmation that the password was successfully changed',
    trigger: 'user.password_changed',
    mergeTags: [
      { tag: '{{user_name}}', label: 'User Name', example: 'John Smith' },
      { tag: '{{changed_at}}', label: 'Changed At', example: 'Feb 12, 2026 3:45 PM' },
    ],
    defaultSubject: 'Your {{site_name}} password has been changed',
    defaultHtml: `<h1>Password Changed</h1>\n<p>Hi {{user_name}},</p>\n<p>Your password was successfully changed on {{changed_at}}.</p>\n<p>If you didn't make this change, please contact us immediately at {{support_email}}.</p>`,
  },
  // Events
  {
    name: 'Event Registration Confirmation', slug: 'event_registration', category: 'events',
    description: 'Sent when someone registers for an event',
    trigger: 'event.registration_confirmed',
    mergeTags: [
      { tag: '{{attendee_name}}', label: 'Attendee Name', example: 'Jane Doe' },
      { tag: '{{event_title}}', label: 'Event Title', example: 'Tech Conference 2026' },
      { tag: '{{event_date}}', label: 'Event Date', example: 'March 15, 2026' },
      { tag: '{{event_time}}', label: 'Event Time', example: '9:00 AM - 5:00 PM' },
      { tag: '{{event_location}}', label: 'Event Location', example: 'Convention Center, Room A' },
      { tag: '{{ticket_type}}', label: 'Ticket Type', example: 'VIP Pass' },
      { tag: '{{confirmation_code}}', label: 'Confirmation Code', example: 'EVT-2026-ABC123' },
      { tag: '{{ticket_url}}', label: 'View Ticket URL', example: 'https://example.com/tickets/abc' },
      { tag: '{{calendar_link}}', label: 'Add to Calendar Link', example: 'https://example.com/cal/abc' },
    ],
    defaultSubject: 'You\'re registered for {{event_title}}!',
    defaultHtml: `<h1>Registration Confirmed!</h1>\n<p>Hi {{attendee_name}},</p>\n<p>You're all set for <strong>{{event_title}}</strong>.</p>\n<table style="margin:16px 0;border-collapse:collapse;">\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Date:</td><td style="padding:4px 0;font-weight:600;">{{event_date}}</td></tr>\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Time:</td><td style="padding:4px 0;">{{event_time}}</td></tr>\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Location:</td><td style="padding:4px 0;">{{event_location}}</td></tr>\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Ticket:</td><td style="padding:4px 0;">{{ticket_type}}</td></tr>\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Confirmation:</td><td style="padding:4px 0;font-family:monospace;">{{confirmation_code}}</td></tr>\n</table>\n<p><a href="{{ticket_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">View Your Ticket</a></p>`,
  },
  {
    name: 'Event Reminder', slug: 'event_reminder', category: 'events',
    description: 'Sent before an event starts (e.g., 24 hours or 1 hour before)',
    trigger: 'event.reminder',
    mergeTags: [
      { tag: '{{attendee_name}}', label: 'Attendee Name', example: 'Jane Doe' },
      { tag: '{{event_title}}', label: 'Event Title', example: 'Tech Conference 2026' },
      { tag: '{{event_date}}', label: 'Event Date', example: 'March 15, 2026' },
      { tag: '{{event_time}}', label: 'Event Time', example: '9:00 AM' },
      { tag: '{{event_location}}', label: 'Event Location', example: 'Convention Center' },
      { tag: '{{time_until}}', label: 'Time Until Event', example: '24 hours' },
      { tag: '{{check_in_url}}', label: 'Check-In URL', example: 'https://example.com/check-in' },
    ],
    defaultSubject: 'Reminder: {{event_title}} starts in {{time_until}}',
    defaultHtml: `<h1>Event Reminder</h1>\n<p>Hi {{attendee_name}},</p>\n<p><strong>{{event_title}}</strong> starts in {{time_until}}!</p>\n<p>📅 {{event_date}} at {{event_time}}<br>📍 {{event_location}}</p>\n<p><a href="{{check_in_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Check In Online</a></p>`,
  },
  {
    name: 'Event Cancellation', slug: 'event_cancellation', category: 'events',
    description: 'Sent when an event is cancelled',
    trigger: 'event.cancelled',
    mergeTags: [
      { tag: '{{attendee_name}}', label: 'Attendee Name', example: 'Jane Doe' },
      { tag: '{{event_title}}', label: 'Event Title', example: 'Tech Conference 2026' },
      { tag: '{{event_date}}', label: 'Event Date', example: 'March 15, 2026' },
      { tag: '{{cancellation_reason}}', label: 'Cancellation Reason', example: 'Due to unforeseen circumstances' },
      { tag: '{{refund_info}}', label: 'Refund Information', example: 'Full refund within 5-10 business days' },
    ],
    defaultSubject: '{{event_title}} has been cancelled',
    defaultHtml: `<h1>Event Cancelled</h1>\n<p>Hi {{attendee_name}},</p>\n<p>We regret to inform you that <strong>{{event_title}}</strong> scheduled for {{event_date}} has been cancelled.</p>\n<p><strong>Reason:</strong> {{cancellation_reason}}</p>\n<p><strong>Refund:</strong> {{refund_info}}</p>\n<p>We apologize for the inconvenience. Please contact us at {{support_email}} if you have questions.</p>`,
  },
  {
    name: 'Event Update', slug: 'event_update', category: 'events',
    description: 'Sent when event details change (time, venue, etc.)',
    trigger: 'event.updated',
    mergeTags: [
      { tag: '{{attendee_name}}', label: 'Attendee Name', example: 'Jane Doe' },
      { tag: '{{event_title}}', label: 'Event Title', example: 'Tech Conference 2026' },
      { tag: '{{update_details}}', label: 'Update Details', example: 'Venue changed to Hall B' },
    ],
    defaultSubject: 'Update: {{event_title}} details have changed',
    defaultHtml: `<h1>Event Update</h1>\n<p>Hi {{attendee_name}},</p>\n<p>There has been an update to <strong>{{event_title}}</strong>:</p>\n<div style="padding:12px;background:#fffbeb;border-radius:6px;border:1px solid #fbbf24;">{{update_details}}</div>\n<p>Please review the changes. Contact us at {{support_email}} if you have questions.</p>`,
  },
  // Commerce
  {
    name: 'Order Confirmation', slug: 'order_confirmation', category: 'commerce',
    description: 'Sent when an order is placed',
    trigger: 'order.confirmed',
    mergeTags: [
      { tag: '{{customer_name}}', label: 'Customer Name', example: 'John Smith' },
      { tag: '{{order_number}}', label: 'Order Number', example: 'ORD-20260215-001' },
      { tag: '{{order_total}}', label: 'Order Total', example: '$99.00' },
      { tag: '{{order_items}}', label: 'Order Items HTML', example: '<li>Widget x1 - $99.00</li>' },
      { tag: '{{shipping_address}}', label: 'Shipping Address', example: '123 Main St, City, ST 12345' },
      { tag: '{{order_url}}', label: 'View Order URL', example: 'https://example.com/orders/abc' },
      { tag: '{{payment_method}}', label: 'Payment Method', example: 'Visa ending in 4242' },
    ],
    defaultSubject: 'Order Confirmed: #{{order_number}}',
    defaultHtml: `<h1>Order Confirmed!</h1>\n<p>Hi {{customer_name}},</p>\n<p>Thank you for your order. Here's your summary:</p>\n<p><strong>Order #{{order_number}}</strong></p>\n<ul>{{order_items}}</ul>\n<p><strong>Total: {{order_total}}</strong></p>\n<p>Shipping to: {{shipping_address}}</p>\n<p><a href="{{order_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">View Order</a></p>`,
  },
  {
    name: 'Shipping Notification', slug: 'shipping_notification', category: 'commerce',
    description: 'Sent when an order ships',
    trigger: 'order.shipped',
    mergeTags: [
      { tag: '{{customer_name}}', label: 'Customer Name', example: 'John Smith' },
      { tag: '{{order_number}}', label: 'Order Number', example: 'ORD-20260215-001' },
      { tag: '{{tracking_number}}', label: 'Tracking Number', example: '1Z999AA10123456784' },
      { tag: '{{carrier}}', label: 'Carrier', example: 'UPS' },
      { tag: '{{tracking_url}}', label: 'Tracking URL', example: 'https://ups.com/track?num=1Z999' },
      { tag: '{{estimated_delivery}}', label: 'Estimated Delivery', example: 'Feb 20, 2026' },
    ],
    defaultSubject: 'Your order #{{order_number}} has shipped!',
    defaultHtml: `<h1>Your Order Has Shipped!</h1>\n<p>Hi {{customer_name}},</p>\n<p>Great news! Order <strong>#{{order_number}}</strong> is on its way.</p>\n<table style="margin:16px 0;border-collapse:collapse;">\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Carrier:</td><td>{{carrier}}</td></tr>\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Tracking:</td><td style="font-family:monospace;">{{tracking_number}}</td></tr>\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Est. Delivery:</td><td>{{estimated_delivery}}</td></tr>\n</table>\n<p><a href="{{tracking_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Track Package</a></p>`,
  },
  {
    name: 'Abandoned Cart', slug: 'abandoned_cart', category: 'commerce',
    description: 'Sent when a customer leaves items in their cart',
    trigger: 'cart.abandoned',
    mergeTags: [
      { tag: '{{customer_name}}', label: 'Customer Name', example: 'John Smith' },
      { tag: '{{cart_items}}', label: 'Cart Items HTML', example: '<li>Widget - $49.00</li>' },
      { tag: '{{cart_total}}', label: 'Cart Total', example: '$49.00' },
      { tag: '{{cart_url}}', label: 'Cart URL', example: 'https://example.com/cart?recover=abc' },
      { tag: '{{coupon_code}}', label: 'Discount Code (optional)', example: 'SAVE10' },
    ],
    defaultSubject: 'You left something behind at {{site_name}}',
    defaultHtml: `<h1>Forget Something?</h1>\n<p>Hi {{customer_name}},</p>\n<p>You left items in your cart. They're waiting for you!</p>\n<ul>{{cart_items}}</ul>\n<p><strong>Total: {{cart_total}}</strong></p>\n<p><a href="{{cart_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Complete Your Order</a></p>`,
  },
  {
    name: 'Return Initiated', slug: 'return_initiated', category: 'commerce',
    description: 'Sent when a return request is submitted',
    trigger: 'return.initiated',
    mergeTags: [
      { tag: '{{customer_name}}', label: 'Customer Name', example: 'John Smith' },
      { tag: '{{order_number}}', label: 'Order Number', example: 'ORD-20260215-001' },
      { tag: '{{return_number}}', label: 'Return Number', example: 'RET-001' },
      { tag: '{{return_items}}', label: 'Return Items', example: 'Widget x1' },
      { tag: '{{return_instructions}}', label: 'Return Instructions', example: 'Ship to our warehouse within 14 days' },
    ],
    defaultSubject: 'Return request #{{return_number}} for order #{{order_number}}',
    defaultHtml: `<h1>Return Request Received</h1>\n<p>Hi {{customer_name}},</p>\n<p>Your return request for order <strong>#{{order_number}}</strong> has been received.</p>\n<p><strong>Return #:</strong> {{return_number}}</p>\n<p><strong>Items:</strong> {{return_items}}</p>\n<p><strong>Instructions:</strong></p>\n<div style="padding:12px;background:#f3f4f6;border-radius:6px;">{{return_instructions}}</div>`,
  },
  {
    name: 'Refund Processed', slug: 'refund_processed', category: 'commerce',
    description: 'Sent when a refund is issued',
    trigger: 'refund.processed',
    mergeTags: [
      { tag: '{{customer_name}}', label: 'Customer Name', example: 'John Smith' },
      { tag: '{{order_number}}', label: 'Order Number', example: 'ORD-20260215-001' },
      { tag: '{{refund_amount}}', label: 'Refund Amount', example: '$49.00' },
      { tag: '{{refund_method}}', label: 'Refund Method', example: 'Original payment method (Visa ending 4242)' },
      { tag: '{{processing_days}}', label: 'Processing Days', example: '5-10 business days' },
    ],
    defaultSubject: 'Refund of {{refund_amount}} processed for order #{{order_number}}',
    defaultHtml: `<h1>Refund Processed</h1>\n<p>Hi {{customer_name}},</p>\n<p>A refund of <strong>{{refund_amount}}</strong> for order <strong>#{{order_number}}</strong> has been processed.</p>\n<p>The refund will be returned to your {{refund_method}} within {{processing_days}}.</p>`,
  },
  {
    name: 'Payment Failed', slug: 'payment_failed', category: 'commerce',
    description: 'Sent when a payment attempt fails',
    trigger: 'payment.failed',
    mergeTags: [
      { tag: '{{customer_name}}', label: 'Customer Name', example: 'John Smith' },
      { tag: '{{order_number}}', label: 'Order Number', example: 'ORD-20260215-001' },
      { tag: '{{failure_reason}}', label: 'Failure Reason', example: 'Card declined' },
      { tag: '{{retry_url}}', label: 'Retry Payment URL', example: 'https://example.com/orders/abc/pay' },
    ],
    defaultSubject: 'Payment failed for order #{{order_number}}',
    defaultHtml: `<h1>Payment Failed</h1>\n<p>Hi {{customer_name}},</p>\n<p>We were unable to process your payment for order <strong>#{{order_number}}</strong>.</p>\n<p><strong>Reason:</strong> {{failure_reason}}</p>\n<p>Please update your payment method and try again:</p>\n<p><a href="{{retry_url}}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Retry Payment</a></p>`,
  },
  // Learning
  {
    name: 'Course Enrollment Confirmation', slug: 'course_enrollment', category: 'learning',
    description: 'Sent when a student enrolls in a course',
    trigger: 'course.enrolled',
    mergeTags: [
      { tag: '{{student_name}}', label: 'Student Name', example: 'Alex Johnson' },
      { tag: '{{course_title}}', label: 'Course Title', example: 'Introduction to Web Development' },
      { tag: '{{course_url}}', label: 'Course URL', example: 'https://example.com/courses/web-dev-101' },
      { tag: '{{instructor_name}}', label: 'Instructor Name', example: 'Dr. Sarah Chen' },
      { tag: '{{start_date}}', label: 'Start Date', example: 'March 1, 2026' },
      { tag: '{{enrollment_id}}', label: 'Enrollment ID', example: 'ENR-2026-001' },
    ],
    defaultSubject: 'You\'re enrolled in {{course_title}}!',
    defaultHtml: `<h1>Enrollment Confirmed!</h1>\n<p>Hi {{student_name}},</p>\n<p>You've been successfully enrolled in <strong>{{course_title}}</strong>.</p>\n<table style="margin:16px 0;border-collapse:collapse;">\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Instructor:</td><td style="padding:4px 0;">{{instructor_name}}</td></tr>\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Starts:</td><td style="padding:4px 0;font-weight:600;">{{start_date}}</td></tr>\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Enrollment ID:</td><td style="padding:4px 0;font-family:monospace;">{{enrollment_id}}</td></tr>\n</table>\n<p><a href="{{course_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Go to Course</a></p>`,
  },
  {
    name: 'Course Completion Certificate', slug: 'course_completion', category: 'learning',
    description: 'Sent when a student completes a course',
    trigger: 'course.completed',
    mergeTags: [
      { tag: '{{student_name}}', label: 'Student Name', example: 'Alex Johnson' },
      { tag: '{{course_title}}', label: 'Course Title', example: 'Introduction to Web Development' },
      { tag: '{{completion_date}}', label: 'Completion Date', example: 'April 15, 2026' },
      { tag: '{{final_grade}}', label: 'Final Grade', example: '92%' },
      { tag: '{{certificate_url}}', label: 'Certificate URL', example: 'https://example.com/certificates/abc123' },
      { tag: '{{instructor_name}}', label: 'Instructor Name', example: 'Dr. Sarah Chen' },
    ],
    defaultSubject: 'Congratulations! You\'ve completed {{course_title}}',
    defaultHtml: `<h1>Course Complete!</h1>\n<p>Hi {{student_name}},</p>\n<p>Congratulations on completing <strong>{{course_title}}</strong>!</p>\n<table style="margin:16px 0;border-collapse:collapse;">\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Completed:</td><td style="padding:4px 0;">{{completion_date}}</td></tr>\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Final Grade:</td><td style="padding:4px 0;font-weight:600;">{{final_grade}}</td></tr>\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Instructor:</td><td style="padding:4px 0;">{{instructor_name}}</td></tr>\n</table>\n<p>Your certificate of completion is ready:</p>\n<p><a href="{{certificate_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">View Certificate</a></p>`,
  },
  {
    name: 'New Lesson Available', slug: 'new_lesson_available', category: 'learning',
    description: 'Sent when a new lesson is published in an enrolled course',
    trigger: 'lesson.published',
    mergeTags: [
      { tag: '{{student_name}}', label: 'Student Name', example: 'Alex Johnson' },
      { tag: '{{course_title}}', label: 'Course Title', example: 'Introduction to Web Development' },
      { tag: '{{lesson_title}}', label: 'Lesson Title', example: 'Lesson 5: CSS Flexbox' },
      { tag: '{{section_title}}', label: 'Section Title', example: 'Module 2: Styling' },
      { tag: '{{lesson_url}}', label: 'Lesson URL', example: 'https://example.com/courses/web-dev/lesson-5' },
    ],
    defaultSubject: 'New lesson available: {{lesson_title}}',
    defaultHtml: `<h1>New Lesson Available</h1>\n<p>Hi {{student_name}},</p>\n<p>A new lesson has been published in <strong>{{course_title}}</strong>:</p>\n<div style="padding:16px;background:#eef2ff;border-radius:8px;margin:16px 0;">\n<p style="margin:0 0 4px 0;color:#6b7280;font-size:12px;">{{section_title}}</p>\n<p style="margin:0;font-weight:600;font-size:16px;">{{lesson_title}}</p>\n</div>\n<p><a href="{{lesson_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Start Lesson</a></p>`,
  },
  {
    name: 'Assignment Due Reminder', slug: 'assignment_due_reminder', category: 'learning',
    description: 'Sent before an assignment or quiz deadline',
    trigger: 'assignment.due_reminder',
    mergeTags: [
      { tag: '{{student_name}}', label: 'Student Name', example: 'Alex Johnson' },
      { tag: '{{course_title}}', label: 'Course Title', example: 'Introduction to Web Development' },
      { tag: '{{assignment_title}}', label: 'Assignment Title', example: 'Quiz 3: JavaScript Basics' },
      { tag: '{{due_date}}', label: 'Due Date', example: 'March 20, 2026 at 11:59 PM' },
      { tag: '{{time_remaining}}', label: 'Time Remaining', example: '48 hours' },
      { tag: '{{assignment_url}}', label: 'Assignment URL', example: 'https://example.com/courses/web-dev/quiz-3' },
    ],
    defaultSubject: 'Reminder: {{assignment_title}} due in {{time_remaining}}',
    defaultHtml: `<h1>Assignment Due Soon</h1>\n<p>Hi {{student_name}},</p>\n<p>This is a reminder that your assignment is due soon:</p>\n<div style="padding:16px;background:#fffbeb;border-radius:8px;border:1px solid #fbbf24;margin:16px 0;">\n<p style="margin:0 0 4px 0;font-weight:600;">{{assignment_title}}</p>\n<p style="margin:0;color:#6b7280;">Course: {{course_title}}</p>\n<p style="margin:8px 0 0 0;color:#d97706;font-weight:600;">Due: {{due_date}} ({{time_remaining}} remaining)</p>\n</div>\n<p><a href="{{assignment_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Start Assignment</a></p>`,
  },
  {
    name: 'Grade Posted', slug: 'grade_posted', category: 'learning',
    description: 'Sent when an instructor posts a grade for an assignment or quiz',
    trigger: 'grade.posted',
    mergeTags: [
      { tag: '{{student_name}}', label: 'Student Name', example: 'Alex Johnson' },
      { tag: '{{course_title}}', label: 'Course Title', example: 'Introduction to Web Development' },
      { tag: '{{assignment_title}}', label: 'Assignment Title', example: 'Quiz 3: JavaScript Basics' },
      { tag: '{{grade}}', label: 'Grade', example: '88/100' },
      { tag: '{{feedback}}', label: 'Instructor Feedback', example: 'Good work! Review the section on closures.' },
      { tag: '{{grades_url}}', label: 'Grades URL', example: 'https://example.com/courses/web-dev/grades' },
    ],
    defaultSubject: 'Grade posted for {{assignment_title}} in {{course_title}}',
    defaultHtml: `<h1>Grade Posted</h1>\n<p>Hi {{student_name}},</p>\n<p>A grade has been posted for your assignment in <strong>{{course_title}}</strong>:</p>\n<div style="padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #86efac;margin:16px 0;">\n<p style="margin:0 0 4px 0;font-weight:600;">{{assignment_title}}</p>\n<p style="margin:0;font-size:24px;font-weight:700;color:#16a34a;">{{grade}}</p>\n</div>\n<p><strong>Instructor Feedback:</strong></p>\n<blockquote style="padding:12px;background:#f3f4f6;border-left:4px solid #6366f1;border-radius:0 6px 6px 0;margin:12px 0;">{{feedback}}</blockquote>\n<p><a href="{{grades_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">View All Grades</a></p>`,
  },
  {
    name: 'Course Expiring Soon', slug: 'course_expiring', category: 'learning',
    description: 'Sent when a student\'s course access is about to expire',
    trigger: 'course.expiring',
    mergeTags: [
      { tag: '{{student_name}}', label: 'Student Name', example: 'Alex Johnson' },
      { tag: '{{course_title}}', label: 'Course Title', example: 'Introduction to Web Development' },
      { tag: '{{expiry_date}}', label: 'Expiry Date', example: 'April 30, 2026' },
      { tag: '{{days_remaining}}', label: 'Days Remaining', example: '7' },
      { tag: '{{progress_percent}}', label: 'Progress', example: '65%' },
      { tag: '{{course_url}}', label: 'Course URL', example: 'https://example.com/courses/web-dev-101' },
      { tag: '{{renew_url}}', label: 'Renew URL', example: 'https://example.com/courses/web-dev-101/renew' },
    ],
    defaultSubject: 'Your access to {{course_title}} expires in {{days_remaining}} days',
    defaultHtml: `<h1>Course Access Expiring</h1>\n<p>Hi {{student_name}},</p>\n<p>Your access to <strong>{{course_title}}</strong> will expire on <strong>{{expiry_date}}</strong> ({{days_remaining}} days remaining).</p>\n<div style="padding:16px;background:#fef2f2;border-radius:8px;border:1px solid #fca5a5;margin:16px 0;">\n<p style="margin:0 0 8px 0;">Current Progress: <strong>{{progress_percent}}</strong></p>\n<div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden;"><div style="background:#2563eb;height:100%;width:{{progress_percent}};border-radius:999px;"></div></div>\n</div>\n<p>Complete your coursework or renew your access before it expires:</p>\n<p>\n<a href="{{course_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;margin-right:8px;">Continue Course</a>\n<a href="{{renew_url}}" style="display:inline-block;padding:12px 24px;background:#fff;color:#2563eb;border:2px solid #2563eb;border-radius:6px;text-decoration:none;font-weight:600;">Renew Access</a>\n</p>`,
  },
  // Notifications
  {
    name: 'Contact Form Submission', slug: 'contact_form', category: 'notifications',
    description: 'Sent to admin when a contact form is submitted',
    trigger: 'form.submitted',
    mergeTags: [
      { tag: '{{sender_name}}', label: 'Sender Name', example: 'Jane Doe' },
      { tag: '{{sender_email}}', label: 'Sender Email', example: 'jane@example.com' },
      { tag: '{{subject}}', label: 'Subject', example: 'Question about your product' },
      { tag: '{{message}}', label: 'Message', example: 'Hi, I had a question about...' },
      { tag: '{{form_name}}', label: 'Form Name', example: 'Contact Us' },
    ],
    defaultSubject: 'New message from {{sender_name}}: {{subject}}',
    defaultHtml: `<h1>New Contact Form Message</h1>\n<p>A new message was submitted via <strong>{{form_name}}</strong>:</p>\n<table style="margin:16px 0;border-collapse:collapse;">\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">From:</td><td>{{sender_name}} ({{sender_email}})</td></tr>\n<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Subject:</td><td>{{subject}}</td></tr>\n</table>\n<div style="padding:12px;background:#f3f4f6;border-radius:6px;">{{message}}</div>`,
  },
  {
    name: 'Newsletter Welcome', slug: 'newsletter_welcome', category: 'notifications',
    description: 'Sent when someone subscribes to the newsletter',
    trigger: 'newsletter.subscribed',
    mergeTags: [
      { tag: '{{subscriber_email}}', label: 'Subscriber Email', example: 'jane@example.com' },
      { tag: '{{subscriber_name}}', label: 'Subscriber Name', example: 'Jane' },
      { tag: '{{unsubscribe_url}}', label: 'Unsubscribe URL', example: 'https://example.com/unsubscribe?t=abc' },
    ],
    defaultSubject: 'Welcome to the {{site_name}} newsletter!',
    defaultHtml: `<h1>Welcome!</h1>\n<p>Hi {{subscriber_name}},</p>\n<p>Thanks for subscribing to the {{site_name}} newsletter. You'll receive our latest updates, tips, and news.</p>\n<p style="font-size:12px;color:#9ca3af;">You can <a href="{{unsubscribe_url}}">unsubscribe</a> at any time.</p>`,
  },
  {
    name: 'New Comment Notification', slug: 'new_comment', category: 'notifications',
    description: 'Sent to admin when a new comment is posted',
    trigger: 'comment.created',
    mergeTags: [
      { tag: '{{commenter_name}}', label: 'Commenter Name', example: 'Jane Doe' },
      { tag: '{{commenter_email}}', label: 'Commenter Email', example: 'jane@example.com' },
      { tag: '{{comment_content}}', label: 'Comment Content', example: 'Great article!' },
      { tag: '{{article_title}}', label: 'Article Title', example: 'How to Build a Website' },
      { tag: '{{moderate_url}}', label: 'Moderation URL', example: 'https://example.com/admin/comments' },
    ],
    defaultSubject: 'New comment on "{{article_title}}" by {{commenter_name}}',
    defaultHtml: `<h1>New Comment</h1>\n<p>A new comment was posted on <strong>{{article_title}}</strong>:</p>\n<p><strong>{{commenter_name}}</strong> ({{commenter_email}}):</p>\n<blockquote style="padding:12px;background:#f3f4f6;border-left:4px solid #2563eb;border-radius:0 6px 6px 0;margin:12px 0;">{{comment_content}}</blockquote>\n<p><a href="{{moderate_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Moderate Comment</a></p>`,
  },
  {
    name: 'New Review Notification', slug: 'new_review', category: 'notifications',
    description: 'Sent to admin when a new review is submitted',
    trigger: 'review.created',
    mergeTags: [
      { tag: '{{reviewer_name}}', label: 'Reviewer Name', example: 'Jane Doe' },
      { tag: '{{rating}}', label: 'Star Rating', example: '4' },
      { tag: '{{review_content}}', label: 'Review Content', example: 'Great product!' },
      { tag: '{{item_title}}', label: 'Product/Course Name', example: 'Premium Widget' },
      { tag: '{{moderate_url}}', label: 'Moderation URL', example: 'https://example.com/admin/reviews' },
    ],
    defaultSubject: 'New {{rating}}-star review on "{{item_title}}"',
    defaultHtml: `<h1>New Review</h1>\n<p>A {{rating}}-star review was posted on <strong>{{item_title}}</strong>:</p>\n<p><strong>{{reviewer_name}}</strong>:</p>\n<blockquote style="padding:12px;background:#f3f4f6;border-left:4px solid #f59e0b;border-radius:0 6px 6px 0;margin:12px 0;">{{review_content}}</blockquote>\n<p><a href="{{moderate_url}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Moderate Review</a></p>`,
  },
];

const EMPTY_FORM = {
  name: '',
  slug: '',
  category: 'authentication',
  subject: '',
  htmlBody: '',
  textBody: '',
  description: '',
  status: 'active' as 'active' | 'draft',
  trigger: '',
};

function autoSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ── Component ──

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState<'html' | 'text'>('html');
  const [testEmail, setTestEmail] = useState('');
  const [activeEditorTab, setActiveEditorTab] = useState<'visual' | 'html' | 'text'>('visual');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-templates', { category: categoryFilter || undefined, search: search || undefined }],
    queryFn: () => emailTemplatesApi.list({ category: categoryFilter || undefined, search: search || undefined })
      .catch(() => [] as any[]),
  });

  const allTemplates: EmailTemplate[] = templates || [];

  // Merge saved templates with definitions for display
  const savedSlugs = new Set(allTemplates.map((t) => t.slug));
  const unsavedDefs = TEMPLATE_DEFS.filter((d) => !savedSlugs.has(d.slug));

  const displayTemplates = [
    ...allTemplates,
    ...unsavedDefs.map((d) => ({
      id: `def_${d.slug}`,
      name: d.name,
      slug: d.slug,
      category: d.category,
      subject: d.defaultSubject,
      htmlBody: d.defaultHtml,
      textBody: '',
      description: d.description,
      status: 'draft' as const,
      isDefault: true,
      mergeTags: [...COMMON_TAGS, ...d.mergeTags],
      trigger: d.trigger,
      updatedAt: '',
    })),
  ];

  const filtered = displayTemplates.filter((t) => {
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.slug.includes(q) || t.description?.toLowerCase().includes(q);
    }
    return true;
  });

  // Group by category
  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    templates: filtered.filter((t) => t.category === cat.key),
  })).filter((g) => g.templates.length > 0);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingId && !editingId.startsWith('def_')) {
        return emailTemplatesApi.update(editingId, data);
      }
      return emailTemplatesApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success(editingId && !editingId.startsWith('def_') ? 'Template updated' : 'Template saved');
      resetEditor();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => emailTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      emailTemplatesApi.sendTest(id, email),
    onSuccess: () => toast.success('Test email sent!'),
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'draft' }) =>
      emailTemplatesApi.update(id, { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success(`Template ${status === 'active' ? 'activated' : 'deactivated'}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetEditor = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowEditor(false);
    setShowPreview(false);
    setActiveEditorTab('visual');
  };

  const startEdit = (template: EmailTemplate & { trigger?: string }) => {
    setForm({
      name: template.name,
      slug: template.slug,
      category: template.category,
      subject: template.subject,
      htmlBody: template.htmlBody || '',
      textBody: template.textBody || '',
      description: template.description || '',
      status: template.status,
      trigger: template.trigger || TEMPLATE_DEFS.find((d) => d.slug === template.slug)?.trigger || '',
    });
    setEditingId(template.id);
    setShowEditor(true);
    setShowPreview(false);
  };

  const startFromDefinition = (def: TemplateDefinition) => {
    setForm({
      name: def.name,
      slug: def.slug,
      category: def.category,
      subject: def.defaultSubject,
      htmlBody: def.defaultHtml,
      textBody: '',
      description: def.description,
      status: 'active',
      trigger: def.trigger,
    });
    setEditingId(null);
    setShowEditor(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim()) return;
    const slug = form.slug || autoSlug(form.name);
    saveMutation.mutate({ ...form, slug });
  };

  const currentDef = TEMPLATE_DEFS.find((d) => d.slug === form.slug);
  const currentTags = [...COMMON_TAGS, ...(currentDef?.mergeTags || [])];

  const insertTag = (tag: string) => {
    if (activeEditorTab === 'visual') {
      // Insert at cursor in contentEditable RichTextEditor
      document.execCommand('insertText', false, tag);
    } else if (activeEditorTab === 'text') {
      setForm((f) => ({ ...f, textBody: f.textBody + tag }));
    } else {
      setForm((f) => ({ ...f, htmlBody: f.htmlBody + tag }));
    }
  };

  // Preview: replace merge tags with example values
  const getPreviewHtml = () => {
    let html = form.htmlBody;
    for (const t of currentTags) {
      html = html.replaceAll(t.tag, `<span style="background:#dbeafe;padding:1px 4px;border-radius:3px;">${t.example}</span>`);
    }
    // Wrap in basic email layout
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1f2937;max-width:600px;margin:0 auto;padding:20px;}</style></head><body>${html}<hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb;"><p style="font-size:12px;color:#9ca3af;">© {{current_year}} ${form.name ? 'Your Company' : '{{site_name}}'}. All rights reserved.</p></body></html>`;
  };

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1';
  const smallLabelCls = 'block text-[10px] font-medium text-gray-500 mb-1';

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Customize transactional emails for authentication, events, commerce, learning, and notifications
          </p>
        </div>
        <button
          onClick={() => { resetEditor(); setShowEditor(true); }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Template
        </button>
      </div>

      {/* Editor */}
      {showEditor && (
        <div className="mb-6 rounded-lg bg-white shadow">
          <form onSubmit={handleSubmit}>
            <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                {editingId ? 'Edit Template' : 'New Template'}
              </h2>
              <button type="button" onClick={resetEditor} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Row 1: Name, Slug, Category, Status */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className={labelCls}>Template Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((f) => ({
                        ...f,
                        name,
                        slug: f.slug === autoSlug(f.name) || !f.slug ? autoSlug(name) : f.slug,
                      }));
                    }}
                    className={inputCls}
                    placeholder="e.g. Order Confirmation"
                  />
                </div>
                <div>
                  <label className={labelCls}>Slug</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className={inputCls}
                    placeholder="auto-generated"
                  />
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={inputCls}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'draft' })}
                    className={inputCls}
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Description + Trigger Event */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className={inputCls}
                    placeholder="When is this email sent?"
                  />
                </div>
                <div>
                  <label className={labelCls}>Trigger Event</label>
                  <select
                    value={form.trigger}
                    onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                    className={inputCls}
                  >
                    {TRIGGER_EVENTS.filter((te) => !te.category || te.category === form.category || te.value === '' || te.value === form.trigger).map((te) => (
                      <option key={te.value} value={te.value}>{te.label}{te.category && te.category !== form.category ? ` (${te.category})` : ''}</option>
                    ))}
                  </select>
                  <p className="mt-0.5 text-[10px] text-gray-400">System event that triggers this email. Active templates with a trigger fire automatically.</p>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className={labelCls}>Subject Line *</label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. Welcome to {{site_name}}!"
                />
                <p className="mt-0.5 text-[10px] text-gray-400">Use merge tags like {'{{site_name}}'} for dynamic content</p>
              </div>

              {/* Merge Tags Reference */}
              {currentTags.length > 0 && (
                <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
                  <p className="text-[10px] font-semibold text-gray-600 mb-2">Available Merge Tags (click to insert)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentTags.map((t) => (
                      <button
                        key={t.tag}
                        type="button"
                        onClick={() => insertTag(t.tag)}
                        className="rounded bg-white border border-gray-200 px-2 py-0.5 text-[10px] font-mono text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        title={`${t.label} — e.g. ${t.example}`}
                      >
                        {t.tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Body Editor Tabs */}
              <div>
                <div className="flex gap-1 mb-2">
                  {([
                    { key: 'visual' as const, label: 'Visual Editor' },
                    { key: 'html' as const, label: 'HTML Source' },
                    { key: 'text' as const, label: 'Plain Text' },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveEditorTab(tab.key)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        activeEditorTab === tab.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className={`ml-auto rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      showPreview ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    {showPreview ? 'Hide Preview' : 'Preview'}
                  </button>
                </div>

                <div className={showPreview ? 'grid grid-cols-2 gap-4' : ''}>
                  {/* Editor */}
                  <div>
                    {activeEditorTab === 'visual' && (
                      <div>
                        <RichTextEditor
                          value={form.htmlBody}
                          onChange={(html) => setForm((f) => ({ ...f, htmlBody: html }))}
                          placeholder="Start writing your email content..."
                        />
                        <p className="mt-1 text-[10px] text-gray-400">Use the toolbar to format content. Click merge tags above to insert dynamic values.</p>
                      </div>
                    )}
                    {activeEditorTab === 'html' && (
                      <textarea
                        value={form.htmlBody}
                        onChange={(e) => setForm({ ...form, htmlBody: e.target.value })}
                        rows={16}
                        className={`${inputCls} font-mono text-[11px] leading-relaxed`}
                        placeholder="Raw HTML source..."
                      />
                    )}
                    {activeEditorTab === 'text' && (
                      <div>
                        <textarea
                          value={form.textBody}
                          onChange={(e) => setForm({ ...form, textBody: e.target.value })}
                          rows={16}
                          className={`${inputCls} font-mono text-xs`}
                          placeholder="Plain text version for email clients that don't support HTML..."
                        />
                        <p className="mt-1 text-[10px] text-gray-400">Optional plain text fallback. If empty, auto-generated from HTML.</p>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  {showPreview && (
                    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-gray-500">Email Preview</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewTab('html')}
                            className={`px-2 py-0.5 text-[10px] rounded ${previewTab === 'html' ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
                          >HTML</button>
                          <button
                            type="button"
                            onClick={() => setPreviewTab('text')}
                            className={`px-2 py-0.5 text-[10px] rounded ${previewTab === 'text' ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
                          >Text</button>
                        </div>
                      </div>
                      <div className="p-1">
                        {/* Subject preview */}
                        <div className="px-3 py-2 bg-gray-50 rounded mb-1">
                          <p className="text-[10px] text-gray-400">Subject:</p>
                          <p className="text-xs font-medium text-gray-900">
                            {currentTags.reduce((s, t) => s.replaceAll(t.tag, t.example), form.subject) || '(no subject)'}
                          </p>
                        </div>
                        {previewTab === 'html' ? (
                          <iframe
                            srcDoc={getPreviewHtml()}
                            className="w-full h-80 border-0"
                            title="Email Preview"
                            sandbox=""
                          />
                        ) : (
                          <pre className="p-3 text-xs text-gray-600 whitespace-pre-wrap h-80 overflow-auto">
                            {form.textBody || '(no plain text version)'}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Send Test */}
              {editingId && !editingId.startsWith('def_') && (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className={smallLabelCls}>Send Test Email</label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className={inputCls}
                      placeholder="your@email.com"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (testEmail.trim()) testMutation.mutate({ id: editingId, email: testEmail.trim() }); }}
                    disabled={testMutation.isPending || !testEmail.trim()}
                    className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                  >
                    {testMutation.isPending ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="border-t border-gray-100 px-5 py-3 flex gap-2">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving...' : editingId && !editingId.startsWith('def_') ? 'Update Template' : 'Save Template'}
              </button>
              <button type="button" onClick={resetEditor} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-white p-1 shadow">
          <button
            onClick={() => setCategoryFilter('')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              !categoryFilter ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >All</button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                categoryFilter === cat.key ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >{cat.label}</button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Search templates..."
        />
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading templates...</div>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No templates match your filter.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.key}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{group.label}</h3>
              <div className="rounded-lg bg-white shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left">
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Template</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Trigger Event</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Subject</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-center">Active</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Last Updated</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.templates.map((template) => {
                      const isUnsaved = template.id.startsWith('def_');
                      return (
                        <tr key={template.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{template.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{template.slug}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {(template as any).trigger ? (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">
                                {(template as any).trigger}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-300">{'\u2014'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-gray-600 truncate max-w-xs">{template.subject}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isUnsaved ? (
                              <span className="text-[10px] text-gray-400">N/A</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleStatusMutation.mutate({ id: template.id, status: template.status === 'active' ? 'draft' : 'active' })}
                                disabled={toggleStatusMutation.isPending}
                                className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                style={{ backgroundColor: template.status === 'active' ? '#22c55e' : '#d1d5db' }}
                                role="switch"
                                aria-checked={template.status === 'active'}
                                title={template.status === 'active' ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
                                    template.status === 'active' ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] text-gray-400">
                              {template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : '\u2014'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {isUnsaved ? (
                                <button
                                  onClick={() => {
                                    const def = TEMPLATE_DEFS.find((d) => d.slug === template.slug);
                                    if (def) startFromDefinition(def);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >Customize</button>
                              ) : (
                                <>
                                  <button onClick={() => startEdit(template)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                                  <button
                                    onClick={() => { if (confirm(`Delete "${template.name}" template?`)) deleteMutation.mutate(template.id); }}
                                    className="text-xs text-red-500 hover:text-red-700"
                                  >Delete</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-400">
        {displayTemplates.length} template{displayTemplates.length !== 1 ? 's' : ''} total
        ({allTemplates.length} customized, {unsavedDefs.length} using defaults)
      </div>
    </div>
  );
}
