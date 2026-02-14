# Agora CMS -- End User Guide

**Version 2.0 | February 2026**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Page Builder](#3-page-builder)
4. [Content Management](#4-content-management)
5. [Media Management](#5-media-management)
6. [Navigation Management](#6-navigation-management)
7. [SEO Optimization](#7-seo-optimization)
8. [Product Management](#8-product-management)
9. [Order Management](#9-order-management)
10. [Coupons & Promotions](#10-coupons--promotions)
11. [Event Management](#11-event-management)
12. [Online Courses & LMS](#12-online-courses--lms)
13. [Email Templates](#13-email-templates)
14. [User Management & Roles](#14-user-management--roles)
15. [Settings](#15-settings)
16. [Tips & Best Practices](#16-tips--best-practices)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Introduction

### What Is Agora CMS?

Agora CMS is a modern, all-in-one content management system that combines a visual drag-and-drop page builder with full e-commerce, event management, and online learning capabilities. Whether you are publishing blog articles, selling physical and digital products, organizing conferences, or delivering online courses, Agora CMS provides the tools you need -- all from a single admin dashboard.

### Key Features

- **Visual Page Builder** -- 88 drag-and-drop components across 14 categories with responsive preview, undo/redo, and auto-save
- **Content Management** -- Pages, articles, categories, tags, comments, reviews, custom forms, gated files, and navigation menus
- **Media Library** -- Upload images, videos, and documents with automatic WebP conversion and responsive thumbnail generation
- **Built-in SEO Analyzer** -- 12 automated checks with letter-grade scoring and actionable recommendations
- **E-Commerce Engine** -- Five product types (Physical, Virtual/Digital, Service, Configurable, Course) with variants, inventory tracking, and flexible pricing
- **Order Management** -- Full order lifecycle from payment through fulfillment, shipping, and refunds
- **Coupons & Promotions** -- Percentage, fixed amount, free shipping, and buy-X-get-Y discount codes
- **Event Management** -- In-person, virtual, and hybrid events with attendee tracking, sessions, badges, QR check-in, sponsor management, and post-event surveys
- **Learning Management System (LMS)** -- Courses with sections, lessons, quizzes, enrollments, grading, and auto-generated certificates
- **Email Templates** -- 22 built-in templates across 5 categories with merge tags, trigger events, and test sending
- **Product Feeds** -- Multi-platform feed generation for Google, Facebook, Pinterest, TikTok, and Bing
- **Role-Based Access Control** -- Six user roles from read-only viewers to super administrators
- **Structured Data** -- Automatic JSON-LD generation for products, organization, and breadcrumbs
- **Integrations** -- Google Analytics 4, Stripe, PayPal, SMTP email, and Salesforce lead capture via forms

### Who Should Use This Guide

This guide is written for non-technical users who work with Agora CMS on a day-to-day basis, including:

- **Content Editors** who create and manage pages, articles, and media
- **Store Managers** who manage products, orders, and promotions
- **Event Coordinators** who organize events, manage attendees, and run check-in stations
- **Course Administrators** who build online courses, manage enrollments, and grade student work
- **Site Administrators** who configure settings, manage users, and maintain the overall site

No programming or developer knowledge is required.

---

## 2. Getting Started

### Accessing the Admin Dashboard

The Agora CMS admin dashboard is where you manage all content, products, orders, events, and settings.

- **Development environment:** `http://localhost:3300`
- **Production environment:** `https://yourdomain.com/admin`

Open your web browser (Chrome, Firefox, Safari, or Edge) and navigate to the appropriate URL. You will be presented with a login screen.

### Login Credentials

The system comes pre-configured with demo accounts for each role. Use these to explore the dashboard and understand what each role can access.

| Role | Email | Password | What You Can Do |
|------|-------|----------|-----------------|
| **Viewer** | viewer@agora-cms.dev | Password123! | View all content and data in read-only mode |
| **Editor** | editor@agora-cms.dev | Password123! | Create and edit pages, articles, and media |
| **Store Manager** | manager@agora-cms.dev | Password123! | Manage products, orders, coupons, and customers |
| **Admin** | admin@agora-cms.dev | Password123! | Full site configuration, settings, and content management |
| **Super Admin** | superadmin@agora-cms.dev | Password123! | Everything above plus user management and system administration |

> **Warning:** Change all default passwords immediately when deploying to a production environment. These credentials are for demonstration purposes only.

### Dashboard Overview

After logging in, the main dashboard gives you an at-a-glance view of your site's activity and quick access to common tasks.

#### Quick Stats Cards

Six summary cards are displayed across the top of the dashboard:

| Card | What It Shows |
|------|---------------|
| **Pages** | Total number of pages on your site |
| **Articles** | Total number of blog articles |
| **Media** | Total files in the media library |
| **Products** | Total products in your catalog |
| **Orders** | Total orders received |
| **Events** | Total events created |

#### Moderation Queues

Below the stats cards, you will see items that need your attention:

- **Pending Comments** -- Comments awaiting approval or rejection
- **Pending Reviews** -- Product reviews awaiting moderation

#### Recent Content

- **Recent Pages** -- The latest pages that have been created or updated
- **Recent Articles** -- The latest blog articles

#### Quick Action Buttons

Shortcut buttons let you jump directly to common tasks such as creating a new page, adding a product, or writing an article.

---

## 3. Page Builder

The page builder is a visual drag-and-drop editor that lets you create professional pages without writing any code.

### Creating a New Page

Follow these steps to create a page from scratch:

1. Click **Pages** in the left sidebar navigation.
2. Click the **New Page** button.
3. Enter a **Title** for the page (for example, "About Us").
4. Set the **Slug** -- this is the URL path for the page (for example, `/about`). The slug is auto-generated from the title, but you can customize it.
5. Choose a **Status**:
   - **Draft** -- Work in progress, not visible to the public
   - **Review** -- Ready for editorial review before publishing
   - **Published** -- Live and visible on your website
   - **Archived** -- Removed from the site but preserved for reference
6. Fill in the **SEO Metadata** section (title tag, meta description) for search engine optimization.
7. Click **Create** to save the page and open the page builder canvas.

### Using Drag-and-Drop

The page builder interface has three main areas:

1. **Component Palette** (left panel) -- A library of all available components organized by category. Browse or search for the component you need.
2. **Canvas** (center) -- A visual preview of your page where you arrange components. This is where you drag components to build your layout.
3. **Properties Panel** (right panel) -- When you select a component on the canvas, this panel shows all of its configurable options.

**To add a component to your page:**

1. Find the component you want in the component palette.
2. Click and drag it from the palette onto the canvas.
3. Drop it in the desired position -- blue highlighted drop zones indicate where the component can be placed.
4. Click the component on the canvas to select it.
5. Use the properties panel on the right to customize its content and appearance.

### Component Library

Agora CMS includes 88 pre-built components organized across 14 categories. Below is the complete library.

#### Layout Components (8)

| Component | Description | Accepts Children |
|-----------|-------------|:----------------:|
| **Container** | Fixed-width wrapper that centers content on the page | Yes |
| **Section** | Full-width page section with configurable padding and background | Yes |
| **Grid** | Multi-column responsive layout with customizable column counts | Yes |
| **Columns** | Multi-column layout with custom width ratios per column | Yes |
| **Tabs** | Tabbed content panels that let users switch between views | Yes |
| **Accordion** | Collapsible content sections (expand/collapse) | No |
| **Divider** | Horizontal separator line with style options | No |
| **Spacer** | Vertical spacing control with adjustable height | No |

#### Typography Components (6)

| Component | Description |
|-----------|-------------|
| **Heading** | Heading tags (H1 through H6) with alignment and color options |
| **Paragraph** | Body text block with formatting controls |
| **Rich Text** | WYSIWYG formatted content block with bold, italic, lists, and links |
| **Blockquote** | Styled quotation with optional attribution line |
| **Code Block** | Syntax-highlighted code display for technical content |
| **List** | Ordered (numbered) and unordered (bulleted) lists |

#### Media Components (6)

| Component | Description |
|-----------|-------------|
| **Image** | Responsive image with alt text, captions, and sizing controls |
| **Video** | Embedded video player supporting YouTube, Vimeo, and self-hosted files |
| **Gallery** | Image gallery displayed in a grid layout with lightbox viewing |
| **Carousel** | Sliding content carousel with autoplay and navigation arrows |
| **Background Video** | Full-section video background with color overlay |
| **Audio Player** | Audio player with playlist support |

#### Marketing Components (10)

| Component | Description |
|-----------|-------------|
| **Hero Banner** | Large header section with headline, description, and call-to-action button |
| **CTA Block** | Call-to-action section with customizable button and text |
| **Feature Grid** | Grid of feature cards with icons and descriptions |
| **Testimonial** | Single customer testimonial card with photo and quote |
| **Testimonial Carousel** | Rotating testimonials with automatic slideshow |
| **Pricing Table** | Plan comparison table with features and pricing tiers |
| **Countdown** | Countdown timer for events, launches, or promotions |
| **Announcement Bar** | Top-of-page notification bar for promotions or alerts |
| **Logo Cloud** | Row of partner, client, or certification logos |
| **Before/After** | Side-by-side image comparison slider |

#### Commerce Components (8)

| Component | Description |
|-----------|-------------|
| **Product Card** | Individual product display with image, name, price, and add-to-cart |
| **Product Grid** | Grid of product cards with filtering and sorting |
| **Product Quick View** | Product preview modal that opens without leaving the page |
| **Featured Products** | Curated showcase of hand-picked products |
| **Category List** | Product category navigation with images |
| **Product Configurator** | Step-by-step product customization wizard |
| **Cart Widget** | Mini cart dropdown showing current cart contents |
| **Cart Page** | Full shopping cart page layout with totals and checkout button |

#### Navigation Components (6)

| Component | Description |
|-----------|-------------|
| **Header** | Site header with logo, navigation links, and optional search |
| **Footer** | Site footer with columns of links, contact info, and copyright |
| **Breadcrumb** | Page breadcrumb trail showing navigation path |
| **Sidebar Menu** | Vertical navigation menu for sidebars |
| **Mega Menu** | Large dropdown navigation panel with columns and images |
| **Table of Contents** | Auto-generated list of links to page sections |

#### Form Components (5)

| Component | Description |
|-----------|-------------|
| **Contact Form** | Customizable contact form with name, email, and message fields |
| **Newsletter Signup** | Email subscription form for mailing lists |
| **Search Bar** | Site-wide search input field |
| **Login/Register** | User authentication form with login and registration tabs |
| **Form Wizard** | Multi-step form with progress indicator |

#### Data Display Components (6)

| Component | Description |
|-----------|-------------|
| **Data Table** | Sortable and filterable data table |
| **Chart** | Bar, line, pie, and doughnut charts for data visualization |
| **Stats Counter** | Animated number counters that count up on scroll |
| **Progress Bar** | Visual progress indicator with percentage label |
| **Timeline** | Chronological event display with dates and descriptions |
| **Comparison Table** | Side-by-side feature comparison matrix |

#### Social & Embed Components (4)

| Component | Description |
|-----------|-------------|
| **Social Links** | Row of social media icon links (Facebook, Twitter, Instagram, etc.) |
| **Share Buttons** | Content sharing buttons for social platforms |
| **Embed** | External content embed via iframes (maps, videos, widgets) |
| **Map** | Interactive map display with location pins |

#### Utility Components (6)

| Component | Description |
|-----------|-------------|
| **Button** | Customizable call-to-action button with link, color, and size options |
| **Icon** | Lucide icon display with sizing and color controls |
| **Alert** | Info, success, warning, and error alert banners |
| **Cookie Consent** | GDPR-compliant cookie consent banner |
| **Back to Top** | Floating scroll-to-top button |
| **Modal** | Popup dialog overlay triggered by button click |

#### Blog & Content Components (6)

| Component | Description |
|-----------|-------------|
| **Blog Post Card** | Blog article preview card with featured image and excerpt |
| **Blog Grid** | Grid of blog post cards with pagination |
| **Author Bio** | Author information display with photo and bio |
| **Related Posts** | Related content suggestions based on category or tags |
| **Post Navigation** | Previous/next post navigation links |
| **Comments** | Comment section with threaded replies |

#### Trust & Social Proof Components (5)

| Component | Description |
|-----------|-------------|
| **Trust Badges** | Security and trust icons (SSL, payment badges, guarantees) |
| **Review Aggregate** | Average rating summary with star display and count |
| **Review List** | Scrollable list of customer reviews |
| **Case Studies Grid** | Grid of case study cards with results and testimonials |
| **Awards** | Award and certification badges display |

#### Interactive Components (5)

| Component | Description |
|-----------|-------------|
| **Toast** | Notification popup messages (temporary, auto-dismiss) |
| **Animated Tabs** | Tabs with smooth transition animations |
| **Calculator** | Interactive calculator widget for quotes or estimates |
| **Searchable FAQ** | Frequently asked questions with search filtering |
| **Lightbox** | Full-screen image or content viewer overlay |

#### Global / Site-Wide Components (3)

| Component | Description |
|-----------|-------------|
| **Site Meta** | SEO meta tags and Open Graph configuration |
| **Error Page** | Custom 404 and 500 error page layouts |
| **Maintenance Page** | Site maintenance notice page |

> **Tip:** All components share common properties for spacing (margin and padding), responsive visibility (show or hide on desktop, tablet, or mobile), animation effects, and accessibility attributes.

### Properties Panel

When you select a component on the canvas, the properties panel on the right displays all of its customizable options. The types of property controls you will encounter include:

| Property Type | Control | Example |
|---------------|---------|---------|
| **Text** | Text input field | Heading text, button label |
| **Number** | Numeric input with increment/decrement | Font size, spacing values |
| **Boolean Toggle** | On/off switch | Show/hide caption, enable autoplay |
| **Color Picker** | Color swatch with picker popup | Background color, text color |
| **Enum Dropdown** | Dropdown selector | Heading level (H1-H6), alignment |
| **URL** | URL input field | Link destination, image source |
| **Image** | Image selector with media library picker | Featured image, background image |
| **Object (Nested)** | Expandable group of sub-properties | Border settings (width, style, color) |
| **Array (Repeater)** | List with add, remove, and reorder | Carousel slides, FAQ items, pricing tiers |

### Layer Tree Navigation

The layer tree provides a hierarchical view of all components on your page, similar to a folder structure. It is located below the component palette.

- **Click** any item in the tree to select that component on the canvas.
- **Drag** items in the tree to reorder components or move them into different parent containers.
- The tree clearly shows parent-child relationships, making it easy to understand your page structure even when components are nested deeply.

### Responsive Preview

Preview how your page will look on different screen sizes using the responsive preview toolbar:

| View | Width | Use |
|------|-------|-----|
| **Desktop** | Full width | Standard computer screens |
| **Tablet** | 768px | iPad and similar tablets |
| **Mobile** | 375px | Smartphones |

Click the device icons in the toolbar to switch between views. Adjust component visibility settings to show or hide specific components per device.

### Keyboard Shortcuts

Speed up your workflow with these keyboard shortcuts:

| Action | Windows / Linux | Mac |
|--------|-----------------|-----|
| Undo | Ctrl+Z | Cmd+Z |
| Redo | Ctrl+Y | Cmd+Y |
| Delete component | Delete | Delete |
| Duplicate component | Ctrl+D | Cmd+D |
| Copy component | Ctrl+C | Cmd+C |
| Paste component | Ctrl+V | Cmd+V |
| Deselect all | Escape | Escape |

> **Note:** Delete and Backspace shortcuts will not trigger when your cursor is inside a text input field.

### Saving and Publishing

Agora CMS auto-saves your work every 30 seconds, so you will not lose changes if you accidentally close your browser.

- **Save Draft** -- Click the **Save** button to manually save your work as a draft. The page will not be visible to the public.
- **Preview** -- Click **Preview** to see exactly how the page will appear to visitors before you publish.
- **Publish** -- Click **Publish** to make the page live. Published pages appear immediately on your website at the slug you configured.
- **Status Changes** -- You can move a page through the workflow at any time: Draft, Review, Published, or Archived.

### Creating and Using Templates

**Save a page as a template:**

1. Open the page you want to use as a template.
2. Click **Actions** and select **Save as Template**.
3. Enter a descriptive template name (for example, "Product Landing Page" or "Team Bio Page").
4. Click **Create Template**.

**Create a new page from a template:**

1. Click **New Page**.
2. Select the **From Template** tab.
3. Choose a template from the list.
4. The page is created with all template components pre-populated.
5. Customize the content, title, and slug to suit your needs.

> **Tip:** Templates are excellent for maintaining consistent layouts across your site. Create templates for common page types like landing pages, about pages, or product showcases.

---

## 4. Content Management

### Articles

Articles are blog posts or news items that appear in your site's blog section. They support rich formatting, categorization, and scheduled publishing.

#### Creating an Article

1. Click **Articles** in the left sidebar.
2. Click **New Article**.
3. Fill in the article details:
   - **Title** -- The headline of your article
   - **Content** -- Use the rich text editor to write your article. The editor supports bold, italic, headings, lists, links, images, and embedded media.
   - **Excerpt** -- A short summary displayed in article listings and search results
   - **Featured Image** -- Select or upload a cover image from the media library
   - **Author** -- Select the author from your user list
   - **Category** -- Assign the article to one or more categories
   - **Tags** -- Add keyword tags for filtering and organization
   - **Slug** -- The URL path for the article (auto-generated from the title)
4. Set the article **Status**: Draft, Review, Published, or Archived.
5. Optionally set a **Scheduled Publish Date** to automatically publish the article at a future date and time.
6. Click **Save**.

#### Article Categories

Categories provide a hierarchical way to organize your articles. For example, you might have top-level categories like "News," "Tutorials," and "Industry Insights," with subcategories beneath each.

To manage categories:

1. Go to **Articles** and then click **Categories**.
2. Click **Add Category**.
3. Enter the category **Name**, **Slug**, and optional **Description**.
4. To create a subcategory, select a **Parent Category** from the dropdown.
5. Click **Save**.

#### Article Tags

Tags are flat, keyword-based labels that provide a secondary layer of organization. Unlike categories (which are hierarchical), tags are simply keywords that help visitors find related content.

To manage tags:

1. Go to **Articles** and then click **Tags**.
2. Click **Add Tag**.
3. Enter the tag **Name** and **Slug**.
4. Click **Save**.

You can assign multiple tags to each article when creating or editing it.

#### Scheduling Articles

To publish an article automatically at a specific date and time:

1. Open the article editor.
2. Set the status to **Published**.
3. Set the **Publish Date** to a future date and time.
4. Click **Save**.

The article will remain hidden until the scheduled date, at which point it will automatically appear on your site.

### Comments & Reviews

#### Comment Moderation

Comments submitted by visitors on articles and pages enter a moderation queue where you can review them before they appear publicly.

**Comment statuses:**

| Status | Meaning |
|--------|---------|
| **Pending** | Awaiting review -- not yet visible to the public |
| **Approved** | Visible on the site |
| **Rejected** | Removed from view (kept for records) |
| **Spam** | Flagged as spam |

**To moderate comments:**

1. Click **Comments** in the left sidebar.
2. You will see the moderation queue with all pending comments listed first.
3. For each comment, you can:
   - **Approve** -- Make the comment visible on the site
   - **Reject** -- Remove the comment from public view
   - **Mark as Spam** -- Flag the comment as spam
   - **Reply** -- Post a response to the comment
4. Use **Bulk Actions** to approve, reject, or mark multiple comments as spam at once by selecting the checkboxes and choosing an action from the dropdown.

#### Review Moderation

Product reviews follow a similar moderation workflow. Reviews include star ratings (1 to 5 stars) and can display a "Verified Purchase" badge when the reviewer has actually purchased the product.

**Review statuses:**

| Status | Meaning |
|--------|---------|
| **Pending** | Awaiting moderation |
| **Approved** | Visible on the product page |
| **Rejected** | Removed from view |

**To moderate reviews:**

1. Click **Reviews** in the left sidebar.
2. Review each submission, checking the rating, review text, and purchase verification.
3. For each review, you can:
   - **Approve** or **Reject** the review
   - **Reply** with an admin response (visible publicly on the product page)
   - Use **Bulk Actions** to process multiple reviews at once

### Forms

The form builder lets you create custom forms for contact pages, lead capture, surveys, and more -- without writing any code.

#### Building a Custom Form

1. Click **Forms** in the left sidebar.
2. Click **New Form**.
3. Enter a **Form Name** (for example, "Contact Us" or "Request a Quote").
4. Use drag-and-drop to add fields to your form from the following 12 field types:

| Field Type | Description | Use Case |
|------------|-------------|----------|
| **Text** | Single-line text input | Name, company name |
| **Email** | Email address input with validation | Contact email |
| **Phone** | Phone number input | Contact phone |
| **Textarea** | Multi-line text input | Message, comments |
| **Select** | Dropdown menu | Choose a department, select a service |
| **Radio** | Single-choice radio buttons | Yes/No, preference selection |
| **Checkbox** | Multi-choice checkboxes | Interests, agreement |
| **File** | File upload field | Resume, documents |
| **Date** | Date picker | Preferred contact date, event date |
| **Number** | Numeric input | Quantity, budget |
| **URL** | Website URL input | Company website |
| **Hidden** | Invisible field (pre-filled value) | Tracking source, campaign ID |

5. For each field, configure:
   - **Label** -- The text displayed above the field
   - **Required** -- Whether the field must be filled in
   - **Placeholder** -- Hint text shown inside the field
   - **Validation** -- Optional regex pattern for custom validation rules
6. Enable **Honeypot Spam Protection** to block automated form submissions without bothering real users with CAPTCHAs.
7. Enable **GDPR Consent** to add a privacy consent checkbox.
8. Optionally enable **Salesforce Lead Capture** to automatically create leads in Salesforce when the form is submitted.
9. Click **Save**.

### Gated Files

Gated files are password-protected file downloads. Use them to share premium content, reports, or resources with authorized users.

1. Click **Gated Files** in the left sidebar.
2. Click **Add Gated File**.
3. Upload the file or select one from the media library.
4. Set a **Password** that users must enter to download the file.
5. Optionally add a **Title** and **Description** to display on the download page.
6. Click **Save**.

The system tracks download statistics for each gated file, including the number of downloads and when they occurred.

---

## 5. Media Management

The media library is the central repository for all images, videos, and documents used across your site.

### Uploading Files

1. Click **Media** in the left sidebar.
2. Click **Upload Files**.
3. Either drag files onto the upload area or click to browse your computer.
4. A progress bar shows the upload status for each file.

**Supported file formats:**

| Type | Formats |
|------|---------|
| **Images** | JPG, PNG, GIF, SVG, WebP, AVIF |
| **Videos** | MP4, WebM, MOV |
| **Documents** | PDF, DOC, DOCX, XLS, XLSX |

### Image Optimization

Agora CMS automatically processes every image you upload to ensure fast page loading:

| Optimization | What Happens |
|--------------|-------------|
| **WebP Conversion** | A WebP version of every image is created automatically. WebP files are typically 25-35% smaller than JPG with no visible quality loss. |
| **Thumbnail (150px)** | A small thumbnail is generated for use in lists, grids, and admin previews. |
| **Medium (300px)** | A medium-sized version is generated for use in cards and sidebars. |
| **Large (1200px)** | A large version is generated for use as hero images and full-width displays. |
| **Responsive Sizing** | The system automatically serves the appropriately sized image based on the visitor's device and screen size. |

Your original uploaded file is always preserved in its full resolution.

### Organizing Your Media

- **Search** -- Type a filename or alt text to find files quickly.
- **Filter by MIME Type** -- Filter the library to show only images, only videos, or only documents.
- **Sort** -- Sort files by upload date, file name, or file size.

### Using Media in Pages

To insert an image or other media file into a page:

1. In the page builder, add an **Image**, **Video**, or **Gallery** component to your canvas.
2. Click the component to select it.
3. In the properties panel, click **Choose Image** (or the equivalent media picker button).
4. The media library opens. Select an existing file or upload a new one.
5. Fill in the **Alt Text** field with a description of the image (important for accessibility and SEO).
6. Adjust sizing and positioning options as needed.

> **Accessibility Tip:** Always write descriptive alt text for every image. Screen readers use alt text to describe images to visually impaired users, and search engines use it to understand your content.

---

## 6. Navigation Management

Navigation menus help visitors explore your site. Agora CMS supports multiple menus in different locations, each with hierarchical (nested) items.

### Creating Navigation Menus

1. Click **Navigation** in the left sidebar.
2. Select the **Location** where you want to create or edit a menu.
3. Click **Add Menu Item**.
4. Fill in:
   - **Label** -- The text displayed to visitors (for example, "About Us")
   - **URL** -- The destination, either a relative path (for example, `/about`) or a full external URL (for example, `https://example.com`)
   - **Position** -- The display order of the item within the menu
5. Click **Save**.

### Navigation Locations

| Location | Where It Appears | Typical Use |
|----------|-----------------|-------------|
| **Header** | Top of every page | Primary site navigation with main sections |
| **Footer** | Bottom of every page | Legal links, policies, secondary navigation |
| **Sidebar** | Left or right side panel | Category filters, secondary navigation, contextual links |
| **Mobile** | Mobile hamburger menu | Simplified navigation optimized for small screens |

### Adding Menu Items

Menu items can link to any destination:

- **Internal pages** -- Use relative paths like `/products`, `/about`, or `/blog`
- **External websites** -- Use full URLs like `https://example.com`
- **Product categories** -- Link to paths like `/category/electronics`
- **Any published page** -- Use the **Page Link Picker** to browse and select from your published pages

### Creating Nested (Dropdown) Menus

Build dropdown menus by creating parent-child relationships:

1. Create a parent menu item (for example, "Products").
2. Create child items beneath it (for example, "Electronics," "Software," "Services").
3. Drag child items underneath the parent in the menu builder.
4. Indent them to establish the hierarchy.

**Example menu structure:**

```
- Home (/)
- Products (/products)
  - Electronics (/category/electronics)
  - Software (/category/software)
  - Services (/category/services)
- Blog (/blog)
- About (/about)
- Contact (/contact)
```

### Editing and Reordering Menu Items

- **Edit** -- Click the pencil icon next to any menu item to change its label or URL.
- **Reorder** -- Drag items up or down to change their display order.
- **Delete** -- Click the trash icon to remove an item. You will be asked to confirm before deletion.

Changes take effect immediately on your live site.

---

## 7. SEO Optimization

Agora CMS includes a built-in SEO analyzer that evaluates your pages and provides a letter grade with specific recommendations for improvement.

### SEO Analyzer

To run the SEO analyzer:

1. Open any page in the page builder.
2. Click the **SEO** tab in the right panel.
3. View your overall score (0 to 100) and letter grade (A through F).
4. Review each individual check and its pass/fail status.

The analyzer performs 12 automated checks across four categories.

#### Content Checks (4)

| Check | What It Evaluates | Pass Criteria |
|-------|-------------------|---------------|
| **Title Tag** | The page title that appears in search results and browser tabs | Between 30 and 70 characters |
| **Meta Description** | The summary text shown beneath the title in search results | Between 120 and 160 characters |
| **Content Length** | The amount of readable text content on the page | 300 or more words (1,000+ is excellent) |
| **Heading Structure** | Proper use of H1, H2, H3 headings in a logical hierarchy | Exactly one H1, headings in sequential order without skipping levels |

#### Technical Checks (3)

| Check | What It Evaluates | Pass Criteria |
|-------|-------------------|---------------|
| **URL Slug** | The page's URL path | Lowercase letters, no special characters, under 75 characters |
| **Canonical URL** | The preferred version of the URL for search engines | A valid HTTPS URL is set |
| **noIndex Check** | Whether the page is blocked from search engine indexing | Not set for pages that should be publicly visible |

#### Media Checks (2)

| Check | What It Evaluates | Pass Criteria |
|-------|-------------------|---------------|
| **Image Alt Text** | Whether all images on the page have descriptive alt text | Every image has alt text |
| **Page Speed Hints** | Image format optimization and page complexity | WebP image variants are used; page has fewer than 50 components |

#### User Experience Checks (3)

| Check | What It Evaluates | Pass Criteria |
|-------|-------------------|---------------|
| **Internal Links** | Whether the page links to other pages on your site | 3 or more internal links |
| **Mobile Content** | Whether the page uses responsive layout components | Grid, flex, or responsive components are present |
| **Open Graph** | Whether social media preview tags are configured | og:title, og:description, and og:image are all set |

### Grading Scale

| Grade | Score Range | Meaning |
|-------|------------|---------|
| **A** | 90 -- 100 | Excellent SEO optimization |
| **B** | 80 -- 89 | Good, with minor improvements possible |
| **C** | 70 -- 79 | Acceptable, but several issues should be addressed |
| **D** | 60 -- 69 | Poor, significant improvements required |
| **F** | Below 60 | Failing, major SEO issues need immediate attention |

### Title Tag Best Practices

Your title tag is one of the most important SEO elements. It appears in search results, browser tabs, and social media shares.

- **Length:** Keep it between 30 and 70 characters. Longer titles get truncated in search results.
- **Keywords first:** Put your most important keywords near the beginning.
- **Be descriptive:** Clearly explain what the page is about.
- **Unique titles:** Every page on your site should have a different title.
- **Brand name:** Consider adding your brand name at the end, separated by a pipe or dash.

```
Good:  "Premium Wireless Headphones - Free Shipping | Agora Store"
Bad:   "Headphones"
```

### Meta Descriptions

The meta description is the summary paragraph shown beneath your title in search results. While it does not directly affect rankings, a compelling description increases click-through rates.

- **Length:** Aim for 120 to 160 characters.
- **Include keywords:** Use them naturally, not stuffed repeatedly.
- **Call to action:** Encourage clicks with phrases like "Shop now," "Learn more," or "Get started."
- **Be accurate:** Summarize the actual page content.

```
Good:  "Discover premium wireless headphones with active noise cancellation,
        30-hour battery life, and studio-quality sound. Free shipping on orders
        over $50."
Bad:   "Buy headphones online."
```

### Open Graph Tags

Open Graph tags control how your page appears when shared on social media platforms like Facebook, LinkedIn, and Twitter.

To configure Open Graph tags:

1. Open the page in the page builder.
2. Click the **SEO** tab.
3. Scroll to **Open Graph Settings**.
4. Fill in:
   - **og:title** -- The title shown on social media (can differ from the SEO title)
   - **og:description** -- The description shown on social media
   - **og:image** -- The preview image (recommended size: 1200 x 630 pixels)

> **Tip:** Use a large, eye-catching image with minimal text overlay for maximum social media engagement.

### Canonical URLs

A canonical URL tells search engines which version of a page is the "official" one. This prevents duplicate content issues when the same content is accessible at multiple URLs.

To set a canonical URL:

1. Open the page in the page builder.
2. Click the **SEO** tab.
3. Enter the full URL in the **Canonical URL** field (for example, `https://yourdomain.com/products/headphones`).

**When to use canonical URLs:**

- Multiple URLs show the same content (for example, `/product` and `/product?ref=email`)
- Product pages with similar variant descriptions
- Paginated content series

### Redirects

Redirects forward visitors and search engines from an old URL to a new one. Use them when you rename or reorganize pages.

**To create a redirect:**

1. Click **Redirects** in the left sidebar.
2. Click **Add Redirect**.
3. Fill in:
   - **From Path** -- The old URL (for example, `/old-page`)
   - **To Path** -- The new URL (for example, `/new-page`)
   - **Status Code** -- 301 or 302
4. Click **Save**.

You can search and filter your redirect list to find specific rules.

**Redirect types:**

| Code | Type | When to Use |
|------|------|-------------|
| **301** | Permanent redirect | The page has moved permanently. Passes SEO ranking value to the new URL. |
| **302** | Temporary redirect | The page has moved temporarily. Does not pass SEO value. |

> **Best Practice:** Always use 301 redirects for permanently renamed or reorganized pages to preserve your search engine rankings.

### Sitemap

Agora CMS automatically generates an XML sitemap for search engines. Your sitemap is available at:

```
https://yourdomain.com/sitemap.xml
```

The sitemap includes all published pages, active products, product categories, last modified dates, and priority hints.

**Submit your sitemap to:**

- **Google Search Console:** https://search.google.com/search-console
- **Bing Webmaster Tools:** https://www.bing.com/webmasters

### Robots.txt

The robots.txt file tells search engine crawlers which areas of your site they should and should not access.

To edit robots.txt:

1. Go to **Settings** and then **SEO**.
2. Find the **Robots.txt** editor.
3. Edit the configuration as needed.
4. Click **Save**.

The default configuration allows crawling of all public pages while blocking admin and API routes:

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Sitemap: https://yourdomain.com/sitemap.xml
```

> **Warning:** Be careful when editing robots.txt. Incorrect rules can prevent your entire site from appearing in search results.

### Structured Data (JSON-LD)

Agora CMS automatically generates structured data in JSON-LD format. Structured data helps search engines understand your content and can enable rich results in search listings (star ratings, pricing, availability, breadcrumbs).

**Automatically generated structured data includes:**

| Type | Data Included |
|------|---------------|
| **Products** | Name, price, currency, availability, star ratings, review count |
| **Organization** | Business name, logo, contact information, social profiles |
| **Breadcrumbs** | Navigation path from home page to current page |

No manual configuration is required. The structured data is generated from your existing content and product data.

---

## 8. Product Management

Agora CMS supports five distinct product types to accommodate different business models. Each type has specialized features tailored to its delivery method.

### Product Types Overview

#### 1. Physical Products

Traditional tangible products that are shipped to the customer.

**Key Features:**
- Inventory tracking with stock quantities and low-stock alerts
- Shipping dimensions (length, width, height) and weight
- Warehouse location assignment
- Variant management with attributes like color and size
- Display types for variants: color swatches, dropdown selectors, or radio buttons
- Bulk variant generation from attribute combinations

**Examples:** Clothing, electronics, furniture, books, accessories

#### 2. Virtual / Digital Products

Products delivered electronically -- no shipping required.

**Key Features:**
- Download delivery with file attachments
- License key management and distribution
- Access URL provisioning for online content
- Automatic fulfillment on successful payment

**Examples:** eBooks, software downloads, stock photos, music files, digital art

#### 3. Service Products

Bookable services with three specialized sub-types.

**Sub-Type: Appointment**
- Duration setting (for example, 30 minutes, 1 hour)
- Capacity (number of people per time slot)
- Lead time requirement (advance booking notice)

**Sub-Type: Subscription**
- Billing interval (monthly, quarterly, annually)
- Trial period configuration
- Recurring payment management

**Sub-Type: Project**
- Estimated hours
- Deliverables list
- Milestone tracking

**Cancellation Policies (all service sub-types):**

| Policy | Description |
|--------|-------------|
| **Flexible** | Full refund up to 24 hours before the service |
| **Moderate** | Full refund up to 5 days before the service |
| **Strict** | 50% refund up to 7 days before the service |
| **Non-Refundable** | No refunds after purchase |

**Examples:** Consulting sessions, coaching calls, design services, gym memberships, cleaning services

#### 4. Configurable Products

Products that require customer customization through a multi-step configuration process.

**Key Features:**
- Multi-step configuration wizard with progress indicator
- Step types: Single Select, Multi Select, Product Select
- Pricing strategies: Additive (adds to base price), Override (replaces base price), Tiered (price changes by configuration level)
- SKU pattern generation based on selected options
- Sub-product linking (each configuration option can reference another product)

**Examples:** Custom-built computers, personalized gifts, made-to-order furniture, meal kits with customizable ingredients

#### 5. Course Products

Products that are linked to a course in the Learning Management System (LMS).

**Key Features:**
- Links directly to an LMS course
- Access duration setting (for example, lifetime access, 12 months, 6 months)
- Auto-enrollment upon purchase (student is automatically enrolled in the course when payment is confirmed)

**Examples:** Online training programs, certification courses, workshop access

### Creating a Product (Step by Step)

1. Click **Products** in the left sidebar.
2. Click **Add Product**.
3. Fill in the **Basic Information**:
   - **Name** -- Product title (for example, "Premium Wireless Headphones")
   - **SKU** -- A unique stock keeping unit identifier (for example, "WH-PRO-001")
   - **Slug** -- The URL path (auto-generated from the name, but you can customize it)
   - **Type** -- Select one of the five product types: Physical, Virtual/Digital, Service, Configurable, or Course
   - **Status** -- Draft or Active
4. Write the **Description**:
   - **Short Description** -- A brief one-to-two sentence summary shown in product listings
   - **Full Description** -- A detailed overview with features, benefits, and specifications
5. Set the **Pricing** (see the Pricing section below).
6. Configure **Type-Specific Settings** (inventory for physical products, download files for virtual products, appointment settings for services, etc.).
7. Assign to one or more **Categories**.
8. Add **Tags** for filtering and organization.
9. Upload **Product Images**.
10. Click **Save**.

### Product Categories

Organize your products into a hierarchical category structure so customers can browse your catalog.

1. Go to **Products** and then **Categories**.
2. Click **Add Category**.
3. Fill in:
   - **Name** -- Category name (for example, "Electronics")
   - **Slug** -- URL path (for example, `electronics`)
   - **Description** -- A brief description of what the category contains
   - **Image** -- An optional category image
   - **Parent Category** -- Select a parent to create a subcategory
4. Click **Save**.

**Example category hierarchy:**

```
Electronics
  - Headphones
  - Speakers
  - Cameras
Clothing
  - Men's
  - Women's
  - Kids
Services
  - Consulting
  - Training
```

### Product Tags

Tags provide a flat (non-hierarchical) way to label and filter products. A product can have multiple tags, and tags can span across categories.

1. Go to **Products** and then **Tags**.
2. Click **Add Tag**.
3. Enter the tag **Name** and **Slug**.
4. Click **Save**.

**Example tags:** "Best Seller," "New Arrival," "On Sale," "Eco-Friendly," "Gift Idea"

### Variant Management

Variants let a single product have multiple options, such as different colors and sizes. Variants are available for **Physical** products.

#### Creating Variant Attributes

1. Edit a physical product.
2. Go to the **Variants** tab.
3. Click **Add Attribute**.
4. Fill in:
   - **Attribute Name** -- For example, "Color" or "Size"
   - **Slug** -- URL-safe identifier (for example, `color`)
   - **Display Type** -- How the options are shown to customers:
     - **Swatch** -- Color circles or image thumbnails
     - **Dropdown** -- A dropdown selector menu
     - **Radio** -- Radio button list
   - **Values** -- The list of available options (for example, "Red, Blue, Black" or "S, M, L, XL")
5. Click **Save Attribute**.

#### Generating Variant Combinations

After adding your attributes, Agora CMS can automatically generate all possible combinations:

1. Click **Generate Variants**.
2. Select which attribute combinations to create (or generate all of them).
3. The system creates every combination automatically.
4. Edit each variant individually to set:
   - **SKU** -- A unique identifier (for example, "WH-PRO-001-RED-L")
   - **Price Override** -- A variant-specific price if it differs from the base price
   - **Inventory Quantity** -- Stock count for this specific variant
   - **Images** -- Photos showing this specific variant
   - **Status** -- Active or Inactive

**Example:** A t-shirt with 3 colors (Red, Blue, Black) and 4 sizes (S, M, L, XL) generates 12 variants automatically.

> **Tip:** Use descriptive SKU patterns that encode the variant attributes for easy inventory management. For example, "TS-RED-M" for a red medium t-shirt.

### Inventory Tracking

For physical products (and their variants):

1. Edit the product.
2. Go to the **Inventory** tab.
3. For each item or variant, configure:
   - **Track Inventory** -- Enable or disable stock tracking
   - **Current Quantity** -- Number of units in stock
   - **Low Stock Threshold** -- The quantity at which you receive a low-stock alert
   - **Warehouse Location** -- Where the item is stored
   - **Allow Backorders** -- Whether to accept orders when stock is zero

The system automatically:
- Reduces inventory when orders are placed
- Displays "Out of Stock" when quantity reaches zero (unless backorders are allowed)
- Sends low-stock alerts to administrators

### Pricing

#### Base Pricing

Every product has these core pricing fields:

- **Base Price** -- The standard selling price
- **Sale Price** -- An optional discounted price (displayed with a strikethrough on the original price)
- **Tax Category** -- Determines how tax is calculated

**Tax Categories:**

| Category | Description |
|----------|-------------|
| **Standard** | Default tax rate for physical goods |
| **Digital** | Tax rate for digital/virtual products (varies by jurisdiction) |
| **Services** | Tax rate for service-based products |
| **Tax-Exempt** | No tax applied |

#### Pricing Models

| Model | Description | Use Case |
|-------|-------------|----------|
| **One-Time** | Customer pays once | Most physical and digital products |
| **Subscription** | Recurring payment at a regular interval | Memberships, SaaS, subscription boxes |
| **Tiered** | Price decreases as quantity increases (volume discount) | Wholesale, bulk purchases |
| **Usage-Based** | Price based on consumption or usage | API calls, storage, metered services |

#### Tiered Pricing (Volume Discounts)

To set up tiered pricing:

1. Select "Tiered" as the pricing model.
2. Add pricing tiers:

| Quantity Range | Price per Unit |
|----------------|---------------|
| 1 -- 10 | $49.99 |
| 11 -- 50 | $44.99 |
| 51 -- 100 | $39.99 |
| 101+ | $34.99 |

The system automatically applies the correct price based on the quantity in the customer's cart.

### Product Images

High-quality images are critical for online sales. Each product can have multiple images.

**To add product images:**

1. Edit the product.
2. Go to the **Images** tab.
3. Click **Add Image**.
4. Upload from your computer or select from the media library.
5. For each image:
   - Write descriptive **Alt Text** for accessibility and SEO
   - Mark one image as the **Primary Image** (the main photo shown in listings)
6. Drag images to reorder them.
7. Click **Save**.

**Image recommendations:**

| Aspect | Recommendation |
|--------|----------------|
| **Resolution** | At least 1200 x 1200 pixels |
| **Format** | JPG for photographs, PNG for graphics with transparency |
| **Background** | White or neutral for clean product shots |
| **Angles** | Include front, back, side, and detail views |
| **Lifestyle** | Include at least one photo showing the product in use |
| **File size** | Keep under 200 KB per image after compression (WebP conversion handles this automatically) |

### Configurable Products (Advanced)

Configurable products use a multi-step wizard that guides customers through building their custom product.

**Setting up a configurable product:**

1. Create a new product and select the **Configurable** type.
2. Go to the **Configuration** tab.
3. Click **Add Step** to create each step of the wizard.
4. For each step, configure:
   - **Step Name** -- For example, "Choose Your Processor," "Select Memory," "Pick a Case"
   - **Step Type**:
     - **Single Select** -- Customer picks one option
     - **Multi Select** -- Customer picks multiple options
     - **Product Select** -- Customer chooses from existing products in your catalog
   - **Options** -- The available choices within the step, each with a name, description, and price adjustment
5. Set the **Pricing Strategy**:
   - **Additive** -- Each selection adds to the base price
   - **Override** -- The final selection determines the total price
   - **Tiered** -- Price changes based on the overall configuration level
6. Define the **SKU Pattern** -- How the final SKU is constructed from selections (for example, "PC-{processor}-{memory}-{storage}")
7. Link **Sub-Products** if individual configuration options correspond to existing products in your catalog.
8. Click **Save**.

### Product Feeds

Product feeds allow you to distribute your product catalog to shopping platforms and advertising networks.

1. Click **Product Feeds** in the left sidebar (under Products).
2. Click **Create Feed**.
3. Configure:
   - **Platform** -- Google Shopping, Facebook/Meta, Pinterest, TikTok, or Bing
   - **Format** -- XML, CSV, or TSV
   - **Schedule** -- How often the feed is regenerated:
     - Hourly
     - Daily
     - Weekly
     - Manual (only when you click "Generate")
   - **Field Mapping** -- Map your product fields to the platform's required fields
   - **Category Mapping** -- Map your product categories to the platform's taxonomy
4. Click **Save and Generate**.

> **Tip:** Start with Google Shopping as it has the broadest reach, then add Facebook and other platforms as needed.

---

## 9. Order Management

The order management system tracks every purchase from payment through fulfillment and beyond.

### Viewing Orders

1. Click **Orders** in the left sidebar.
2. The orders list shows:
   - **Order Number** -- Unique identifier
   - **Customer** -- Name or email address
   - **Date** -- When the order was placed
   - **Status** -- Current fulfillment status
   - **Total** -- Order amount

**Filter orders by:**

- Status (Pending, Processing, Shipped, etc.)
- Date range
- Customer name or email
- Product name

Click any order to view its full details.

### Order Status Workflow

Orders progress through the following statuses:

| Status | Description | What Happens Next |
|--------|-------------|-------------------|
| **Pending** | Payment initiated but not yet confirmed | Wait for payment confirmation |
| **Confirmed** | Payment received successfully | Begin processing the order |
| **Processing** | Order is being prepared | Pack items and create shipping labels |
| **Shipped** | Order has been dispatched | Tracking information is sent to the customer |
| **In Transit** | Carrier has the package (auto-updated from tracking) | Monitor tracking for delivery |
| **Delivered** | Customer has received the order | Wait for any returns or mark as complete |
| **Completed** | Order is fully fulfilled with no outstanding issues | No further action required |
| **Cancelled** | Order was cancelled before shipment | Issue a refund if payment was already received |
| **Refunded** | Payment has been returned to the customer | Archive the order |
| **Returned** | Customer returned the items | Inspect items and restock inventory |

### Fulfillment by Product Type

#### Physical Products

1. Open the order.
2. Click **Fulfill Order**.
3. Select which items to ship (you can partially fulfill an order if some items ship separately).
4. Enter shipping details:
   - **Carrier** -- USPS, FedEx, UPS, DHL, or other
   - **Tracking Number** -- The carrier's package tracking ID
5. Click **Mark as Shipped**.

The system automatically sends a shipping confirmation email to the customer with the tracking number.

#### Virtual / Digital Products

Virtual products are fulfilled automatically when payment is confirmed:

1. The system detects successful payment.
2. An email is sent to the customer with download links, license keys, or access URLs.
3. The line items are marked as "Fulfilled."
4. The order status is updated to "Completed."

#### Service Products

1. Open the order.
2. View the service booking details (scheduled date/time, duration, status).
3. Take action:
   - **Confirm Booking** -- Send a confirmation email to the customer
   - **Reschedule** -- Change the appointment date and time
   - **Mark Complete** -- After the service has been delivered
   - **Cancel** -- Cancel the appointment

### Refunds

To issue a refund:

1. Open the order.
2. Click **Refund**.
3. Choose:
   - **Full Refund** -- Return the entire payment
   - **Partial Refund** -- Return a specific amount or specific line items
4. Add a reason for the refund (optional, may be visible to the customer).
5. Click **Process Refund**.

If Stripe or PayPal is configured, the refund is processed automatically through the payment gateway. The system updates the order status to "Refunded," restocks inventory (for physical products), and sends a refund confirmation email.

### Order History

Every action on an order is logged in a chronological event history:

- Payment received
- Status changes (with timestamps and who made the change)
- Shipping details added
- Refunds issued
- Notes added by staff

To view the history, open any order and scroll to the **Order Events** section. This audit trail is valuable for customer service and dispute resolution.

---

## 10. Coupons & Promotions

Create discount codes to drive sales, reward loyal customers, and run promotions.

### Creating a Coupon

1. Click **Coupons** in the left sidebar.
2. Click **Add Coupon**.
3. Fill in:
   - **Code** -- The code customers will enter at checkout (for example, "WELCOME10" or "FREESHIP")
   - **Description** -- An internal note about the purpose of the coupon
   - **Active** -- Toggle the coupon on or off

### Discount Types

| Type | How It Works | Example |
|------|-------------|---------|
| **Percentage** | Reduces the order total by a percentage | "SAVE15" gives 15% off |
| **Fixed Amount** | Reduces the order total by a fixed dollar amount | "TAKE20" gives $20 off |
| **Free Shipping** | Removes all shipping charges | "FREESHIP" waives shipping fees |
| **Buy X Get Y** | Customer buys a specified quantity and gets additional items free or discounted | "BUY2GET1" buys 2 items and gets 1 free |

### Coupon Scope

Control which products a coupon applies to:

| Scope | Description |
|-------|-------------|
| **All Products** | The coupon applies to every product in the store |
| **Specific Products** | The coupon only applies to selected individual products |
| **Specific Categories** | The coupon only applies to products in selected categories |

### Usage Limits

- **Total Usage Limit** -- The maximum number of times the coupon can be redeemed across all customers (for example, limit to 100 total uses)
- **Per-Customer Limit** -- The maximum number of times a single customer can use the coupon
- **Minimum Order Amount** -- The minimum cart total required to use the coupon (for example, $50 minimum)
- **Current Usage** -- A real-time counter showing how many times the coupon has been redeemed

### Expiration Dates

- **Start Date** -- The date and time the coupon becomes active
- **End Date** -- The date and time the coupon expires

Leave these blank for a coupon with no time restriction. Expired coupons are automatically deactivated.

### Coupon Best Practices

- Keep codes short and memorable (for example, "SUMMER25" rather than "SUMMER2026DISCOUNT25PCT")
- Use all capital letters for clarity
- Avoid visually ambiguous characters (0/O, 1/I/l)
- Always set an expiration date to create urgency
- Set a minimum order amount on fixed-amount discounts to protect margins
- Monitor usage and disable codes that are being abused
- Test every coupon before sharing it with customers

---

## 11. Event Management

Agora CMS provides a full-featured event management system for organizing in-person, virtual, and hybrid events of any scale -- from small workshops to multi-day conferences.

### Creating an Event

1. Click **Events** in the left sidebar.
2. Click **Create Event**.
3. Fill in the basic details:
   - **Title** -- The event name
   - **Description** -- A detailed description of the event
   - **Date and Time** -- Start and end dates/times
   - **Type**:
     - **In Person** -- Held at a physical venue
     - **Virtual** -- Held online (via video conference, webinar, etc.)
     - **Hybrid** -- Combination of in-person and virtual attendance
   - **Format**:
     - **Single Event** -- A one-time event
     - **Multi-Day** -- Spans multiple consecutive days
     - **Conference** -- A large event with multiple sessions, speakers, and tracks
     - **Recurring** -- Repeats on a regular schedule
   - **Status**: Draft, Published, Cancelled, Completed, or Sold Out
   - **Ticketing and Pricing** -- Set ticket types, quantities, and prices

4. Assign **Categories** and **Tags** for organization and filtering.
5. Select or create a **Venue** (for in-person or hybrid events).
6. Click **Save**.

### Event Categories and Tags

Just like products and articles, events can be organized using categories and tags:

- **Categories** -- Hierarchical groupings (for example, "Workshops," "Conferences," "Webinars")
- **Tags** -- Keyword labels (for example, "Free," "Professional Development," "Networking")

### Venues

For in-person and hybrid events, you can manage venue information:

1. Go to **Events** and then **Venues**.
2. Click **Add Venue**.
3. Fill in:
   - **Name** -- Venue name
   - **Address** -- Full street address
   - **Capacity** -- Maximum number of attendees
   - **Images** -- Photos of the venue
4. Click **Save**.

Once created, venues can be reused across multiple events.

### Attendees

Each event has an **Attendees** sub-page where you manage everyone who has registered.

**Attendee statuses:**

| Status | Meaning |
|--------|---------|
| **Registered** | Has signed up but has not yet arrived |
| **Checked In** | Has arrived and checked in at the event |
| **Checked Out** | Has left the event |
| **Cancelled** | Registration was cancelled |
| **No Show** | Did not attend despite registering |

**Attendee management features:**

- **QR Code Generation** -- A unique QR code is generated for each attendee, which can be used for check-in, badge printing, and session scanning
- **Check-In / Check-Out Actions** -- Mark attendees as checked in or checked out with a single click
- **Waitlist Management** -- When an event reaches capacity, additional registrants are placed on a waitlist and notified if spots open up
- **Seat Assignments** -- Assign specific seats to attendees (useful for conferences, theaters, or training rooms)
- **Custom Fields** -- Collect additional information during registration (dietary requirements, t-shirt size, company name, etc.)

### Sessions

For conferences and multi-session events, the **Sessions** sub-page lets you schedule and manage individual sessions within an event.

**Session types:**

| Type | Description |
|------|-------------|
| **Keynote** | Main-stage presentation for all attendees |
| **Breakout** | Smaller focused sessions running in parallel |
| **Workshop** | Hands-on interactive session |
| **Panel** | Discussion with multiple speakers |
| **Networking** | Structured networking time |
| **Break** | Coffee break, lunch, or intermission |

**For each session, configure:**

- **Title and Description** -- What the session is about
- **Speaker(s)** -- Assign one or more speakers
- **Room / Track** -- Where the session takes place and which conference track it belongs to
- **Time Slot** -- Start and end times
- **Capacity** -- Maximum number of attendees for the session
- **Seating Type**:
  - **Open** -- First come, first served
  - **Reserved** -- Assigned seating
- **Tags** -- Keywords for filtering (for example, "Beginner," "Technical," "Leadership")

### Badges

The **Badges** sub-page includes a template designer for creating professional attendee badges.

#### Badge Template Designer

1. Click **Badges** on the event detail page.
2. Click **Design Badge** or edit an existing template.
3. Customize the badge layout:
   - **Dimensions** -- Choose from standard sizes or Avery nametag sizes
   - **Colors** -- Background color, text color, accent colors
   - **Fields** -- Select which attendee information appears on the badge (name, company, role, registration type, etc.)
   - **Logo** -- Upload your event or organization logo
   - **QR Code** -- Include the attendee's unique QR code on the badge
   - **Custom Text** -- Add any additional text (event name, dates, WiFi password, etc.)

#### Badge Sizes

| Size Category | Options |
|--------------|---------|
| **Standard Sizes** | 4" x 3", 3.5" x 2", 4" x 6", A6 (105mm x 148mm) |
| **Avery Nametag Sizes** | 5395 (2-1/3" x 3-3/8"), 8395 (2-1/3" x 3-3/8" -- same size, different stock), 5390 (2-1/4" x 3-1/2"), 5392 (3" x 4"), 5163 (2" x 4") |

#### Printing Badges

1. Design your badge template.
2. Click **Print Preview** to see how badges will look with real attendee data and QR codes.
3. Select which attendees to print badges for (all, specific groups, or individual attendees).
4. Click **Print** to open your browser's print dialog for batch printing.

> **Tip:** For best results, use a laser printer with cardstock or Avery nametag sheets that match your selected size.

### Sponsors

The **Sponsors** sub-page lets you manage event sponsors with visibility on the event page.

1. Click **Sponsors** on the event detail page.
2. Click **Add Sponsor**.
3. Fill in:
   - **Name** -- Sponsor's organization name
   - **Logo** -- Upload the sponsor's logo
   - **Description** -- Brief description of the sponsor
   - **Tier Level** -- Categorize by sponsorship level (for example, Platinum, Gold, Silver, Bronze)
   - **Website URL** -- Link to the sponsor's website
4. Click **Save**.

Sponsors are displayed on the event page, typically organized by tier.

### Surveys

Collect feedback from attendees with post-event and session-specific surveys.

1. Click **Surveys** on the event detail page.
2. Click **Create Survey**.
3. Add questions with various response types (rating scales, multiple choice, free text).
4. Choose when to send the survey:
   - **Post-Event** -- Sent after the entire event concludes
   - **Post-Session** -- Sent after a specific session ends
5. Click **Save and Activate**.

Survey responses are collected and viewable in the admin dashboard.

### Self Check-In Station

The Check-In Station is a self-service interface designed to be displayed on a tablet or kiosk at the event entrance.

Attendees can check themselves in using any of these methods:

| Method | How It Works |
|--------|-------------|
| **Email Lookup** | Attendee types their email address to look up their registration |
| **Confirmation Code** | Attendee enters the confirmation code from their registration email |
| **QR Code Scan** | Attendee scans their QR code using the device's camera |

To set up a check-in station:

1. Open the event.
2. Click **Check-In Station**.
3. The full-screen check-in interface opens and is ready for use.
4. Place the device at the event entrance for self-service check-in.

### Session Scanner

The session scanner is a QR code scanning interface used to track attendance at individual sessions within a conference.

1. Open the event.
2. Click **Session Scanner**.
3. Select the session you want to track.
4. Scan attendee QR codes as they enter the session room.
5. Attendance is recorded automatically.

### Exhibitor Scanner (Lead Capture)

The exhibitor scanner is a lead capture tool for exhibitors and sponsors at your event. It allows booth staff to scan attendee badges and capture contact information for follow-up.

**Features:**
- Scan attendee QR codes to instantly capture their registration data
- Add a **Rating** (hot lead, warm lead, cold lead)
- Add **Notes** about the conversation or interest
- **Export** captured leads as CSV or JSON files for import into CRM systems

**To use the exhibitor scanner:**

1. Open the event.
2. Click **Exhibitor Scanner**.
3. The scanning interface opens.
4. Scan attendee QR codes at your booth.
5. Rate each lead and add notes.
6. At the end of the event, click **Export** to download your leads.

---

## 12. Online Courses & LMS

Agora CMS includes a full Learning Management System (LMS) for creating, selling, and delivering online courses.

### Creating a Course

1. Click **Courses** in the left sidebar.
2. Click **Create Course**.
3. Fill in the course details:
   - **Title** -- Course name (for example, "Introduction to Web Development")
   - **Description** -- Course overview, learning objectives, and what students will gain
   - **Price** -- Course price (or set to free)
   - **Status**:
     - **Draft** -- Work in progress, not available to students
     - **Published** -- Open for enrollment
     - **Archived** -- No longer available but preserved for reference
   - **Thumbnail** -- Course cover image
4. Click **Save**.

### Building the Curriculum

Courses are structured as **Sections** containing **Lessons**.

#### Adding Sections

1. Open the course editor.
2. Click **Add Section** to create a major division of the course (for example, "Getting Started," "Core Concepts," "Advanced Topics").
3. Enter the section **Title** and optional **Description**.
4. Drag sections to reorder them.

#### Adding Lessons

1. Within a section, click **Add Lesson**.
2. Fill in:
   - **Title** -- Lesson name
   - **Content** -- Use the rich text editor to write lesson material. You can include text, images, and embedded media.
   - **Media** -- Attach video, audio, or downloadable files
   - **Order** -- The position of the lesson within the section (drag to reorder)
   - **Prerequisites** -- Optionally require students to complete earlier lessons before accessing this one
3. Click **Save**.

### Quizzes

Quizzes assess student knowledge and can be placed within any section of the course.

#### Creating a Quiz

1. Within a section, click **Add Quiz**.
2. Configure quiz settings:
   - **Title** -- Quiz name
   - **Passing Score** -- Minimum percentage to pass (for example, 70%)
   - **Time Limit** -- Optional countdown timer (for example, 30 minutes)
   - **Attempts Allowed** -- Number of retries permitted (for example, 3 attempts)
3. Add questions:

| Question Type | Description | Grading |
|---------------|-------------|---------|
| **Multiple Choice** | Select one correct answer from several options | Automatic |
| **Short Answer** | Type a text response | Manual grading required |
| **Essay** | Write a longer text response | Manual grading required |

4. For each question, set the **Points** value.
5. Build a **Question Bank** -- create a pool of questions and have the system randomly select a subset for each student.
6. Click **Save Quiz**.

### Enrollments

Manage who has access to each course.

1. Open a course and click the **Enrollments** tab.
2. View all enrolled students with their status and progress.

**Enrollment statuses:**

| Status | Meaning |
|--------|---------|
| **Active** | Student is currently enrolled and progressing through the course |
| **Completed** | Student has finished all course requirements |
| **Suspended** | Student's access has been temporarily paused |

**Enrollment management actions:**

- **Manual Enrollment** -- Add a student directly by searching for their account
- **Set Expiration Date** -- Define when the student's access expires (for example, 12 months from enrollment)
- **Change Status** -- Suspend or reactivate a student's enrollment

> **Note:** If a Course product is purchased through the store, the student is automatically enrolled upon payment confirmation.

### Grading Queue

Short answer and essay questions require manual grading by an instructor or administrator.

1. Click **Courses** and then select a course.
2. Click the **Grading** tab.
3. The grading queue shows all submissions awaiting review.
4. For each submission:
   - Read the student's answer
   - View the **Rubric** (if one is defined for the question)
   - Assign **Points** based on the quality of the response
   - Write **Feedback** for the student explaining the grade
5. Click **Submit Grade**.

The student is notified of their grade and can view the feedback in their course dashboard.

### Certificates

When a student completes all course requirements, a certificate of completion can be automatically generated.

**Certificate generation is automatic** -- once a student finishes every lesson and passes all quizzes, the certificate is created and made available for download as a PDF.

To configure certificate settings:

1. Open the course settings.
2. Go to the **Certificate** tab.
3. Enable certificate generation.
4. Customize the certificate text and design.
5. Click **Save**.

---

## 13. Email Templates

Agora CMS includes a built-in email template system with 22 pre-built templates that are automatically sent when specific events occur in the system.

### Template Categories

The 22 built-in templates are organized across 5 categories:

| Category | Templates | Purpose |
|----------|-----------|---------|
| **Authentication** (5) | Welcome email, password reset, email verification, account locked, account unlocked | User account lifecycle |
| **Events** (4) | Registration confirmation, event reminder, event cancelled, session update | Event attendee communications |
| **Commerce** (6) | Order confirmation, shipping notification, refund confirmation, order cancelled, review request, abandoned cart | Purchase lifecycle |
| **Learning** (6) | Course enrollment, lesson available, quiz results, certificate ready, course completion, enrollment expiring | Student course communications |
| **Notifications** (4) | Comment approved, comment reply, new review, system alert | General notifications |

### Trigger Events

Each template is tied to one of 26 system trigger events. When the event occurs, the associated email is sent automatically.

**Example trigger events:**

| Trigger Event | When It Fires |
|---------------|---------------|
| `user.registered` | A new user creates an account |
| `user.password_reset` | A user requests a password reset |
| `order.confirmed` | An order payment is successfully processed |
| `order.shipped` | An order is marked as shipped with tracking information |
| `order.refunded` | A refund is processed |
| `event.registration_confirmed` | An attendee registers for an event |
| `event.reminder` | A scheduled reminder before the event starts |
| `course.enrolled` | A student is enrolled in a course |
| `course.completed` | A student finishes all course requirements |
| `course.certificate_ready` | A completion certificate has been generated |

### Merge Tags

Merge tags are dynamic placeholders that are replaced with real data when the email is sent. Enclose them in double curly braces.

**Common merge tags:**

| Tag | Replaced With |
|-----|--------------|
| `{{user_name}}` | The recipient's full name |
| `{{user_email}}` | The recipient's email address |
| `{{order_number}}` | The order's unique identifier |
| `{{order_total}}` | The order's total amount |
| `{{tracking_number}}` | The shipment tracking number |
| `{{event_title}}` | The event's name |
| `{{event_date}}` | The event's date and time |
| `{{course_title}}` | The course name |
| `{{lesson_title}}` | The lesson name |
| `{{certificate_url}}` | Link to download the certificate |
| `{{site_name}}` | Your website's name |
| `{{reset_link}}` | Password reset URL |

### Editing Email Templates

1. Click **Email Templates** in the left sidebar.
2. Browse or search the template list.
3. Click a template to open the editor.
4. Edit:
   - **Subject Line** -- The email subject, which can include merge tags
   - **HTML Body** -- The rich HTML version of the email
   - **Text Body** -- The plain text fallback version
5. Use the **Preview** button to see how the email will look with sample data.
6. Use the **Send Test Email** button to send a test email to your own address and verify it looks correct in an actual inbox.
7. Click **Save**.

### Activation Toggle

Each template has an **Active/Draft** toggle directly in the template list:

- **Active** -- The email will be sent automatically when its trigger event occurs
- **Draft** -- The email is disabled and will not be sent

This allows you to quickly enable or disable specific emails without editing or deleting them.

### Creating New Templates

You can create templates in two ways:

- **From Definition** -- Select a pre-defined template type and customize it. This pre-fills the trigger event and merge tags for you.
- **From Scratch** -- Start with a blank template and configure the trigger event, subject, and body yourself.

---

## 14. User Management & Roles

Agora CMS uses a role-based access control system with six permission levels.

### User Roles

| Role | Description |
|------|-------------|
| **Customer** | End users who have registered an account on the public website. They can view their orders, manage their profile, and leave reviews. No admin dashboard access. |
| **Viewer** | Read-only access to the admin dashboard. Can view all content, products, orders, and settings but cannot make any changes. Ideal for stakeholders who need visibility. |
| **Editor** | Can create and edit pages, articles, and media. Can manage navigation and content. Cannot manage products, orders, or site settings. |
| **Store Manager** | Can manage products, categories, orders, coupons, and customers. Focused on e-commerce operations. |
| **Admin** | Full access to site configuration, content, products, orders, SEO, integrations, and settings. Cannot manage user accounts. |
| **Super Admin** | All permissions, including user management, system configuration, and security settings. Full control over the entire platform. |

### Role Permissions Matrix

| Action | Customer | Viewer | Editor | Store Manager | Admin | Super Admin |
|--------|:--------:|:------:|:------:|:-------------:|:-----:|:-----------:|
| View public site content | Yes | Yes | Yes | Yes | Yes | Yes |
| Access admin dashboard | -- | Yes | Yes | Yes | Yes | Yes |
| View content/data (read-only) | -- | Yes | Yes | Yes | Yes | Yes |
| Create/edit pages | -- | -- | Yes | -- | Yes | Yes |
| Create/edit articles | -- | -- | Yes | -- | Yes | Yes |
| Upload media | -- | -- | Yes | Yes | Yes | Yes |
| Manage navigation | -- | -- | Yes | -- | Yes | Yes |
| Manage forms | -- | -- | Yes | -- | Yes | Yes |
| Moderate comments/reviews | -- | -- | Yes | -- | Yes | Yes |
| Manage products | -- | -- | -- | Yes | Yes | Yes |
| Manage categories/tags | -- | -- | -- | Yes | Yes | Yes |
| Process orders | -- | -- | -- | Yes | Yes | Yes |
| Create coupons | -- | -- | -- | Yes | Yes | Yes |
| Manage events | -- | -- | -- | -- | Yes | Yes |
| Manage courses | -- | -- | -- | -- | Yes | Yes |
| Configure settings | -- | -- | -- | -- | Yes | Yes |
| Manage email templates | -- | -- | -- | -- | Yes | Yes |
| Manage users and roles | -- | -- | -- | -- | -- | Yes |
| System administration | -- | -- | -- | -- | -- | Yes |

### Creating a New User

1. Go to **Users** in the left sidebar (Super Admin only).
2. Click **Add User**.
3. Fill in:
   - **Name** -- The user's full name
   - **Email** -- Login email address (must be unique)
   - **Role** -- Select the appropriate role from the dropdown
   - **Password** -- Set a temporary password (the user should change this on first login)
4. Click **Create User**.

### Editing User Profiles

1. Find the user in the users list.
2. Click **Edit**.
3. Update any of the following:
   - **Name** -- Change the display name
   - **Email** -- Update the email address
   - **Role** -- Change the user's permission level
   - **Author Profile** -- Set a bio, avatar, and social links (for users who author articles)
4. Click **Save Changes**.

### Account Management

- **Deactivate Account** -- Disable a user's login without deleting their data. Edit the user and toggle the **Active** switch off.
- **Unlock Account** -- If a user has been locked out due to too many failed login attempts, you can manually unlock their account from the user edit screen.
- **Reset Password** -- Trigger a password reset email from the user edit screen.

---

## 15. Settings

The Settings section contains all global configuration options for your site. Access it by clicking **Settings** in the left sidebar.

### General

| Setting | Description |
|---------|-------------|
| **Site Name** | Your website's name, displayed in the browser title bar and email footers |
| **Tagline** | A short description or slogan for your site |
| **Logo** | Upload your site logo for use in the header, emails, and branding |
| **Favicon** | The small icon displayed in browser tabs (recommended: 32 x 32 pixels, .ico or .png) |
| **Timezone** | Select from 50+ timezone options. Affects scheduled publishing, order timestamps, and event times |
| **Language** | The default language for the admin interface |
| **Default Currency** | The currency used for product prices and order totals |
| **Default Author** | The author assigned to new content when no specific author is selected |

### Site Status

| Setting | Description |
|---------|-------------|
| **Maintenance Mode** | Toggle maintenance mode on to temporarily take the public site offline. Visitors see a maintenance page while administrators can still access the dashboard. |
| **Health Checks** | View the status of system components (database, file storage, email service, etc.) to ensure everything is running properly |

### Appearance

| Setting | Description |
|---------|-------------|
| **Color Scheme** | Set the primary, secondary, and accent colors used across your site's theme |
| **Theme** | Select from available themes or customize the current one |
| **Fonts** | Choose heading and body fonts from a curated list of web fonts |

### Blog

| Setting | Description |
|---------|-------------|
| **Enable Blog** | Toggle the blog section on or off entirely |
| **Posts Per Page** | Number of articles displayed per page in blog listings (for example, 10 or 20) |
| **RSS Feed** | Enable or disable the RSS feed for your blog |
| **Comment Moderation** | Choose whether comments are published immediately or require moderation before appearing |
| **Excerpt Length** | The number of characters shown in article previews and listings |

### SEO

| Setting | Description |
|---------|-------------|
| **Sitemap** | Enable automatic XML sitemap generation |
| **Meta Defaults** | Set default title tag format and meta description for pages that do not have custom SEO settings |
| **Robots.txt** | Edit the robots.txt file that controls search engine crawling behavior |
| **Canonical URLs** | Configure default canonical URL settings |
| **Structured Data** | Enable or disable automatic JSON-LD generation for products, organization, and breadcrumbs |

### Analytics

| Setting | Description |
|---------|-------------|
| **Google Analytics 4** | Enter your GA4 Measurement ID (format: G-XXXXXXXXXX) to track website traffic and user behavior |
| **Event Tracking** | Configure which user actions are tracked as GA4 events (page views, add to cart, purchases, etc.) |
| **Custom Codes** | Add custom JavaScript tracking codes for other analytics platforms |

### Payments

| Setting | Description |
|---------|-------------|
| **Stripe** | Enter your Stripe API keys (Publishable Key and Secret Key) to accept credit card payments. Toggle between test mode and live mode. |
| **PayPal** | Enter your PayPal credentials to accept PayPal payments |
| **Currency** | Set the currency for payment processing |
| **Tax Settings** | Configure how taxes are applied to orders |

### Shipping

| Setting | Description |
|---------|-------------|
| **Shipping Rates** | Define flat-rate, weight-based, or price-based shipping rates |
| **Shipping Zones** | Create geographic zones with different shipping rates and carrier options |
| **Free Shipping Threshold** | Set a minimum order amount for free shipping (for example, free shipping on orders over $50) |
| **Carrier Integration** | Configure connections with shipping carriers (USPS, FedEx, UPS, DHL) for real-time rate calculation |

### Tax

| Setting | Description |
|---------|-------------|
| **Tax Rates** | Define tax rates by percentage for different tax categories |
| **Tax Categories** | Manage the four tax categories: Standard, Digital, Services, and Tax-Exempt |
| **Geographic Rules** | Set tax rules based on the customer's location (state, province, or country) |

### Email

| Setting | Description |
|---------|-------------|
| **SMTP Configuration** | Enter your email server settings (host, port, username, password, encryption) so the system can send emails |
| **From Address** | Set the sender email address and name that appear on all outgoing system emails |

### System

| Setting | Description |
|---------|-------------|
| **File Upload Limits** | Set maximum file sizes for image, video, and document uploads |
| **API Configuration** | Configure API rate limits, authentication settings, and API key management |
| **Debug Mode** | Enable verbose error logging for troubleshooting (should be disabled in production) |
| **Cache** | Configure caching settings to improve site performance. Clear the cache when content changes are not appearing. |
| **Backups** | Configure automatic database backups and download backup files |

---

## 16. Tips & Best Practices

### Content Strategy

- **Plan your site structure first.** Before building pages, map out your site's information architecture. Determine your main sections, how they relate to each other, and how visitors will navigate between them.
- **Write for your audience.** Use language your visitors understand. Avoid jargon unless your audience expects it.
- **Be consistent.** Use the same tone, formatting, and visual style across all pages. Create page templates to maintain consistency.
- **Keep content fresh.** Regularly update pages and publish new articles to keep visitors coming back and improve search engine rankings.
- **Use the Draft-Review-Published workflow.** Save work as drafts until it is ready. Use the Review status for editorial approval before publishing.

### SEO Tips

- Run the **SEO Analyzer** on every page before publishing and aim for an A or B grade.
- Write unique, descriptive **title tags** (30 to 70 characters) for every page.
- Write compelling **meta descriptions** (120 to 160 characters) that encourage clicks.
- Use exactly **one H1 heading** per page, followed by H2s and H3s in logical order.
- Add descriptive **alt text** to every image.
- Include at least **3 internal links** on every page to help search engines discover your content.
- Set **Open Graph tags** for every important page so it looks good when shared on social media.
- Use **301 redirects** when you move or rename pages to preserve search engine rankings.
- Submit your **sitemap** to Google Search Console and Bing Webmaster Tools.

### Product Photography

- **Lighting:** Use natural light or softbox lighting. Avoid harsh shadows.
- **Background:** Use a clean white or neutral background for product-only shots. Include lifestyle shots showing the product in use.
- **Resolution:** Shoot at a minimum of 1200 x 1200 pixels.
- **Angles:** Capture the product from front, back, side, and detail views.
- **Consistency:** Use the same lighting, background, and framing for all products to create a professional, cohesive catalog.
- **Format:** Save as JPG for photographs at 80-90% quality. Agora CMS will handle WebP conversion automatically.

### Order Management Workflow

1. **Monitor daily:** Check the Orders dashboard each morning for new orders.
2. **Confirm promptly:** Move orders from Pending to Confirmed as soon as payment is verified.
3. **Process efficiently:** Batch-process orders for shipping to save time.
4. **Add tracking:** Always enter tracking numbers when marking orders as shipped. Customers expect tracking information.
5. **Handle refunds quickly:** Process refund requests within 24 to 48 hours to maintain customer satisfaction.
6. **Review returns:** Inspect returned items and restock inventory promptly.

### Event Planning Checklist

- [ ] Create the event with all basic details (title, dates, type, format)
- [ ] Set up the venue with address, capacity, and images
- [ ] Configure ticketing and pricing
- [ ] Create sessions with speakers, rooms, time slots, and tracks
- [ ] Design and test attendee badges (verify QR codes print correctly)
- [ ] Set up sponsor listings with logos and tier levels
- [ ] Create post-event and session surveys
- [ ] Test the self check-in station on the device you will use at the event
- [ ] Test the session scanner with a sample QR code
- [ ] Prepare exhibitor scanner instructions for booth staff
- [ ] Send event reminder emails one week and one day before the event
- [ ] Export attendee and lead data after the event for follow-up

### Email Template Optimization

- **Keep subject lines short and specific** -- under 50 characters for best open rates.
- **Personalize with merge tags** -- use `{{user_name}}` to address recipients by name.
- **Always send test emails** before activating a new or edited template.
- **Include a plain text version** -- some email clients do not render HTML.
- **Review the preview** on both desktop and mobile to make sure the layout looks correct.
- **Disable unused templates** -- use the Active/Draft toggle to prevent sending emails that are not relevant to your business.

---

## 17. Troubleshooting

### Common Issues

#### Login Problems

**Symptom:** "Invalid credentials" error or account locked message.

**Solutions:**
1. Double-check that you are entering the correct email address (email addresses are case-sensitive).
2. Make sure Caps Lock is not turned on.
3. Click **Forgot Password** on the login page to reset your password via email.
4. If your account is locked due to too many failed attempts, wait 15 minutes for the automatic unlock, or ask a Super Admin to manually unlock your account.
5. If none of the above works, contact your site administrator.

#### Images Not Loading

**Symptom:** Broken image icons, missing images, or blank image areas on pages.

**Solutions:**
1. Open the page in the page builder and check that the image component has a valid image selected in its properties.
2. Go to the Media Library and verify that the image was uploaded successfully and appears in the library.
3. Make sure the image file format is supported (JPG, PNG, GIF, SVG, WebP, or AVIF).
4. Check that the image file is within the upload size limit (check Settings > System > File Upload Limits).
5. Try re-uploading the image.
6. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R) and reload the page.

#### Orders Not Updating

**Symptom:** Order status is stuck on "Pending" even though payment was confirmed, or status changes are not being reflected.

**Solutions:**
1. Check your payment gateway configuration (Settings > Payments) to ensure API keys are correct and the connection is active.
2. Open the order details and look at the Order Events section for error messages.
3. If payment was verified externally (in the Stripe or PayPal dashboard), you can manually update the order status to "Confirmed."
4. Check that webhook endpoints are correctly configured in your payment provider's dashboard.
5. If the issue persists, contact your site administrator to review webhook logs.

#### Email Not Sending

**Symptom:** Users are not receiving registration emails, order confirmations, or password reset links.

**Solutions:**
1. Go to Settings > Email and verify that the SMTP configuration is correct (host, port, username, password, and encryption method).
2. Check that the **From Address** is a valid email address and that your email provider allows sending from it.
3. Verify that the relevant email template is set to **Active** (not Draft) in the Email Templates section.
4. Send a **Test Email** from the email template editor to check whether emails are being delivered.
5. Check the recipient's spam or junk folder.
6. Ask your site administrator to review the system logs for email delivery errors.

#### Pages Not Appearing on the Live Site

**Symptom:** A page you created is not visible to visitors.

**Solutions:**
1. Make sure the page status is set to **Published** (not Draft, Review, or Archived).
2. Verify the page slug is correct and does not conflict with another page.
3. Clear the site cache (Settings > System > Cache > Clear All Caches).
4. Check that the page is linked in your navigation menu so visitors can find it.

#### Drag-and-Drop Not Working in Page Builder

**Symptom:** Components cannot be dragged from the palette or reordered on the canvas.

**Solutions:**
1. Make sure you are using a supported browser (Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+).
2. Update your browser to the latest version.
3. Disable browser extensions that might interfere with drag-and-drop (ad blockers, script blockers).
4. Try using a different browser to rule out browser-specific issues.
5. Clear your browser cache and reload the page.

### Getting Help

If you cannot resolve an issue using the solutions above:

1. **Check this guide** -- Use your browser's find function (Ctrl+F or Cmd+F) to search for keywords related to your issue.
2. **Review system logs** -- Go to Settings > System > Logs to view error messages and system events (Admin or Super Admin access required).
3. **Contact support:**
   - Email: support@agora-cms.com
   - When contacting support, please include:
     - Your email address and role
     - A description of the issue
     - Steps to reproduce the problem
     - Screenshots showing the issue (if applicable)
     - Your browser name and version
4. **Community forum:** https://community.agora-cms.com
5. **Video tutorials:** https://agora-cms.com/tutorials

---

*Agora CMS End User Guide -- Version 2.0 -- February 2026*
*For the latest updates, visit https://agora-cms.com/docs*
