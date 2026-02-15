import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ============================================================
  // USERS - One per role
  // ============================================================
  // Development/test password for seeded demo users only
  // IMPORTANT: This is a well-known demo password - NEVER use in production
  const DEMO_PASSWORD = 'Password123!';
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'viewer@agora-cms.dev' },
      update: {},
      create: {
        email: 'viewer@agora-cms.dev',
        name: 'Demo Viewer',
        passwordHash,
        role: UserRole.viewer,
      },
    }),
    prisma.user.upsert({
      where: { email: 'editor@agora-cms.dev' },
      update: {},
      create: {
        email: 'editor@agora-cms.dev',
        name: 'Demo Editor',
        passwordHash,
        role: UserRole.editor,
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager@agora-cms.dev' },
      update: {},
      create: {
        email: 'manager@agora-cms.dev',
        name: 'Demo Store Manager',
        passwordHash,
        role: UserRole.store_manager,
      },
    }),
    prisma.user.upsert({
      where: { email: 'admin@agora-cms.dev' },
      update: {},
      create: {
        email: 'admin@agora-cms.dev',
        name: 'Demo Admin',
        passwordHash,
        role: UserRole.admin,
      },
    }),
    prisma.user.upsert({
      where: { email: 'superadmin@agora-cms.dev' },
      update: {},
      create: {
        email: 'superadmin@agora-cms.dev',
        name: 'Demo Super Admin',
        passwordHash,
        role: UserRole.super_admin,
      },
    }),
  ]);

  const adminUser = users[3]!;
  console.log(`Created ${users.length} users`);

  // ============================================================
  // NAVIGATION
  // ============================================================
  await prisma.navigation.upsert({
    where: { location: 'header' },
    update: {},
    create: {
      location: 'header',
      items: [
        { label: 'Home', url: '/', position: 0 },
        { label: 'Products', url: '/products', position: 1 },
        { label: 'About', url: '/about', position: 2 },
        { label: 'Contact', url: '/contact', position: 3 },
      ],
    },
  });

  await prisma.navigation.upsert({
    where: { location: 'footer' },
    update: {},
    create: {
      location: 'footer',
      items: [
        { label: 'Privacy Policy', url: '/privacy', position: 0 },
        { label: 'Terms of Service', url: '/terms', position: 1 },
        { label: 'Contact Us', url: '/contact', position: 2 },
      ],
    },
  });

  console.log('Created navigation menus');

  // ============================================================
  // PAGES
  // ============================================================
  const homePage = await prisma.page.upsert({
    where: { slug: '/' },
    update: {},
    create: {
      slug: '/',
      title: 'Home',
      status: 'published',
      publishedAt: new Date(),
      createdBy: adminUser.id,
      seo: {
        metaTitle: 'Agora CMS | Home',
        metaDescription: 'Welcome to our modern CMS-powered website.',
        ogImage: null,
        canonicalUrl: null,
        noIndex: false,
      },
      componentTree: {
        root: {
          componentId: 'page-container',
          instanceId: 'root',
          props: {},
          children: [
            {
              instanceId: 'hero-1',
              componentId: 'hero-banner',
              props: {
                headline: 'Welcome to Agora CMS',
                subheadline: 'Build beautiful websites with our drag-and-drop editor',
                backgroundColor: '#1e293b',
                layout: 'centered',
                cta: { label: 'Get Started', url: '/products', style: 'primary' },
              },
              children: [],
            },
            {
              instanceId: 'grid-1',
              componentId: 'grid',
              props: { columns: 3, gap: '24px' },
              children: [
                {
                  instanceId: 'heading-1',
                  componentId: 'heading',
                  props: { level: 3, text: 'Easy to Use' },
                  children: [],
                },
                {
                  instanceId: 'heading-2',
                  componentId: 'heading',
                  props: { level: 3, text: 'Fully Customizable' },
                  children: [],
                },
                {
                  instanceId: 'heading-3',
                  componentId: 'heading',
                  props: { level: 3, text: 'SEO Optimized' },
                  children: [],
                },
              ],
            },
            {
              instanceId: 'cta-1',
              componentId: 'cta-block',
              props: {
                heading: 'Ready to get started?',
                description: 'Create your first page in minutes.',
                buttonLabel: 'Start Building',
                buttonUrl: '/builder',
              },
              children: [],
            },
          ],
        },
      },
    },
  });

  const aboutPage = await prisma.page.upsert({
    where: { slug: '/about' },
    update: {},
    create: {
      slug: '/about',
      title: 'About Us',
      status: 'published',
      publishedAt: new Date(),
      createdBy: adminUser.id,
      seo: {
        metaTitle: 'About Us | Agora CMS',
        metaDescription: 'Learn about our mission and team.',
        ogImage: null,
        canonicalUrl: null,
        noIndex: false,
      },
      componentTree: {
        root: {
          componentId: 'page-container',
          instanceId: 'root',
          props: {},
          children: [
            {
              instanceId: 'heading-about',
              componentId: 'heading',
              props: { level: 1, text: 'About Us', alignment: 'center' },
              children: [],
            },
            {
              instanceId: 'paragraph-about',
              componentId: 'paragraph',
              props: {
                text: 'We are building the next generation of content management systems.',
                alignment: 'center',
                fontSize: 'lg',
              },
              children: [],
            },
          ],
        },
      },
    },
  });

  console.log(`Created ${2} pages`);

  // ============================================================
  // CATEGORIES
  // ============================================================
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and accessories',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'software' },
      update: {},
      create: {
        name: 'Software',
        slug: 'software',
        description: 'Digital software and licenses',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'services' },
      update: {},
      create: {
        name: 'Services',
        slug: 'services',
        description: 'Professional services and consulting',
      },
    }),
  ]);

  console.log(`Created ${categories.length} categories`);

  // ============================================================
  // SAMPLE PRODUCTS (one per type)
  // ============================================================
  const physicalProduct = await prisma.product.upsert({
    where: { sku: 'WIDGET-001' },
    update: {},
    create: {
      sku: 'WIDGET-001',
      name: 'Premium Widget',
      slug: 'premium-widget',
      description: 'A high-quality widget for all your needs.',
      shortDescription: 'The finest widget available.',
      type: 'physical',
      status: 'active',
      pricing: {
        currency: 'USD',
        basePrice: 4999,
        salePrice: null,
        pricingModel: 'one_time',
        taxCategory: 'standard',
      },
      shipping: {
        requiresShipping: true,
        weight: { value: 500, unit: 'g' },
        dimensions: { length: 20, width: 15, height: 10, unit: 'cm' },
        shippingClass: 'standard',
        originWarehouse: 'warehouse-east-01',
        freeShippingEligible: false,
      },
      variantAttrs: [
        { name: 'Color', slug: 'color', values: ['Blue', 'Red', 'Black'], displayType: 'swatch' },
        { name: 'Size', slug: 'size', values: ['S', 'M', 'L'], displayType: 'dropdown' },
      ],
      variants: [
        {
          variantId: 'var-001',
          sku: 'WIDGET-001-BLU-M',
          attributes: { color: 'Blue', size: 'M' },
          priceOverride: null,
          salePrice: null,
          inventory: { tracked: true, quantity: 100, lowStockThreshold: 10, allowBackorder: false },
          weight: { value: 500, unit: 'g' },
          images: [],
          status: 'active',
        },
      ],
      images: [{ url: '/media/widget-blue.webp', alt: 'Blue Premium Widget', isPrimary: true }],
      tags: ['new-arrival', 'best-seller'],
    },
  });

  const virtualProduct = await prisma.product.upsert({
    where: { sku: 'EBOOK-001' },
    update: {},
    create: {
      sku: 'EBOOK-001',
      name: 'Ultimate Guide eBook',
      slug: 'ultimate-guide-ebook',
      description: 'A comprehensive guide to building modern web applications.',
      shortDescription: 'Learn web development from scratch.',
      type: 'virtual',
      status: 'active',
      pricing: {
        currency: 'USD',
        basePrice: 1999,
        salePrice: null,
        pricingModel: 'one_time',
        taxCategory: 'digital_goods',
      },
      digital: {
        deliveryMethod: 'download',
        downloadableFiles: [
          {
            fileId: 'file-001',
            filename: 'ultimate-guide.pdf',
            s3Key: 'downloads/ultimate-guide.pdf',
            maxDownloads: 5,
            expiresAfterDays: 30,
          },
        ],
        licenseKeyPool: null,
        accessUrl: null,
      },
      images: [{ url: '/media/ebook-cover.webp', alt: 'Ultimate Guide Cover', isPrimary: true }],
      tags: ['digital', 'education'],
    },
  });

  const serviceProduct = await prisma.product.upsert({
    where: { sku: 'CONSULT-001' },
    update: {},
    create: {
      sku: 'CONSULT-001',
      name: '1-Hour Strategy Session',
      slug: 'strategy-session',
      description: 'A one-on-one strategy consultation with our expert team.',
      shortDescription: 'Get personalized advice from experts.',
      type: 'service',
      status: 'active',
      pricing: {
        currency: 'USD',
        basePrice: 14999,
        salePrice: null,
        pricingModel: 'one_time',
        taxCategory: 'services_exempt',
      },
      service: {
        serviceType: 'appointment',
        durationMinutes: 60,
        capacityPerSlot: 1,
        availabilitySchedule: null,
        bookingLeadTimeHours: 24,
        cancellationPolicy: 'flexible',
        deliverables: ['Strategy document', '30-min follow-up call'],
        recurringConfig: null,
      },
      images: [
        { url: '/media/consultation.webp', alt: 'Strategy Session', isPrimary: true },
      ],
      tags: ['services', 'consulting'],
    },
  });

  console.log('Created 3 sample products');

  // ============================================================
  // INTEGRATIONS (inactive stubs)
  // ============================================================
  await Promise.all([
    prisma.integration.upsert({
      where: { type: 'stripe' },
      update: {},
      create: { type: 'stripe', config: {}, status: 'inactive' },
    }),
    prisma.integration.upsert({
      where: { type: 'ga4' },
      update: {},
      create: { type: 'ga4', config: {}, status: 'inactive' },
    }),
    prisma.integration.upsert({
      where: { type: 'salesforce' },
      update: {},
      create: { type: 'salesforce', config: {}, status: 'inactive' },
    }),
  ]);

  console.log('Created integration placeholders');

  // ============================================================
  // COUPONS
  // ============================================================
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: '10% off your first order',
      discountType: 'percentage',
      discountValue: 1000, // 10.00%
      minOrderAmount: 2000, // $20.00
      maxUsageCount: 1000,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'FREESHIP' },
    update: {},
    create: {
      code: 'FREESHIP',
      description: 'Free shipping on orders over $50',
      discountType: 'free_shipping',
      discountValue: 0,
      minOrderAmount: 5000,
      isActive: true,
    },
  });

  console.log('Created 2 coupons');

  console.log('\nSeed complete!');
  console.log('Login credentials (all users): Password123!');
  console.log('Users: viewer@, editor@, manager@, admin@, superadmin@ @agora-cms.dev');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
