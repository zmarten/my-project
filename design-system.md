# Personal Portfolio Design System
*Modern. Sleek. Subtly Natural.*

---

## Design Philosophy

This design system embodies a **refined outdoor aesthetic** — think architectural photography of cabins in forests, not camping gear catalogs. The vibe is calm, grounded, and organic without sacrificing modern sophistication. Like a well-designed hiking trail: intentional, clean, but unmistakably connected to nature.

**Core Principles:**
- **Organic Modernism**: Natural inspiration meets contemporary design
- **Breathing Space**: Generous whitespace like open mountain vistas
- **Refined Textures**: Subtle grain and soft shadows, never heavy-handed
- **Purposeful Motion**: Smooth, natural transitions like wind through trees

---

## Color Palette

### Primary Colors

```css
--forest-deep: #1a3a2e;      /* Deep forest green - headers, primary text */
--moss-main: #2d5a4a;        /* Rich moss - primary buttons, links */
--sage-medium: #6b8f71;      /* Soft sage - secondary elements */
--fern-bright: #95c7a0;      /* Fresh fern - accents, hover states */
```

### Neutral Tones

```css
--stone-dark: #3d3d3d;       /* Charcoal - body text */
--stone-medium: #6b6b6b;     /* Medium gray - secondary text */
--mist-light: #e8ebe9;       /* Soft mist - backgrounds, cards */
--cloud-white: #f7f9f8;      /* Off-white - main background */
--pure-white: #ffffff;       /* Pure white - overlays, highlights */
```

### Accent Colors

```css
--earth-warm: #c9a277;       /* Warm earth - highlights, call-to-action accents */
--sky-pale: #d4e5e8;         /* Pale sky - info states, subtle backgrounds */
--bark-brown: #5a4a3a;       /* Bark brown - tertiary text, borders */
```

### Semantic Colors

```css
--success: #6b8f71;          /* Using sage for success states */
--warning: #c9a277;          /* Using earth for warnings */
--error: #a85f52;            /* Muted terracotta for errors */
--info: #d4e5e8;             /* Using sky for info */
```

---

## Typography

### Font Families

**Display/Headings:**
```css
--font-display: 'Playfair Display', 'Georgia', serif;
/* Elegant, refined serif with organic curves */
```

**Body Text:**
```css
--font-body: 'Source Sans 3', 'Segoe UI', sans-serif;
/* Clean, highly readable sans-serif with warmth */
```

**Monospace/Code:**
```css
--font-mono: 'JetBrains Mono', 'Courier New', monospace;
/* For any code snippets or technical details */
```

### Type Scale

```css
--text-xs: 0.75rem;      /* 12px - captions, labels */
--text-sm: 0.875rem;     /* 14px - small body text */
--text-base: 1rem;       /* 16px - base body text */
--text-lg: 1.125rem;     /* 18px - large body, intro paragraphs */
--text-xl: 1.25rem;      /* 20px - subheadings */
--text-2xl: 1.5rem;      /* 24px - section headings */
--text-3xl: 2rem;        /* 32px - page headings */
--text-4xl: 2.5rem;      /* 40px - hero headings */
--text-5xl: 3rem;        /* 48px - display headings */
```

### Font Weights

```css
--weight-light: 300;
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

### Line Heights

```css
--leading-tight: 1.2;     /* Headings */
--leading-snug: 1.375;    /* Subheadings */
--leading-normal: 1.6;    /* Body text */
--leading-relaxed: 1.75;  /* Long-form content */
```

---

## Spacing System

Using an 8px base unit for consistency:

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.5rem;    /* 24px */
--space-6: 2rem;      /* 32px */
--space-8: 3rem;      /* 48px */
--space-10: 4rem;     /* 64px */
--space-12: 6rem;     /* 96px */
--space-16: 8rem;     /* 128px */
```

**Usage Guidelines:**
- Small gaps/padding: `space-2` to `space-4`
- Medium spacing between components: `space-5` to `space-6`
- Large section spacing: `space-8` to `space-12`
- Hero/dramatic spacing: `space-16`

---

## Layout & Grid

### Container Widths

```css
--container-sm: 640px;    /* Small content (blog posts) */
--container-md: 768px;    /* Medium content */
--container-lg: 1024px;   /* Main content area */
--container-xl: 1280px;   /* Wide layouts */
--container-max: 1440px;  /* Maximum width */
```

### Breakpoints

```css
--screen-sm: 640px;       /* Mobile landscape */
--screen-md: 768px;       /* Tablet */
--screen-lg: 1024px;      /* Laptop */
--screen-xl: 1280px;      /* Desktop */
--screen-2xl: 1536px;     /* Large desktop */
```

### Grid System

Use CSS Grid with natural, asymmetric layouts:
- 12-column grid for flexibility
- Avoid perfectly centered, symmetric layouts
- Create visual interest with 2:1 or 1:3 column ratios
- Use generous gutters (24-32px)

---

## Components

### Buttons

**Primary Button:**
```css
background: var(--moss-main);
color: var(--pure-white);
padding: var(--space-3) var(--space-6);
border-radius: 4px;
font-weight: var(--weight-medium);
transition: all 0.3s ease;

/* Hover */
background: var(--forest-deep);
transform: translateY(-2px);
box-shadow: 0 4px 12px rgba(42, 90, 74, 0.2);
```

**Secondary Button:**
```css
background: transparent;
color: var(--moss-main);
border: 2px solid var(--sage-medium);
padding: var(--space-3) var(--space-6);
border-radius: 4px;

/* Hover */
background: var(--mist-light);
border-color: var(--moss-main);
```

**Text Button:**
```css
background: transparent;
color: var(--moss-main);
font-weight: var(--weight-semibold);
text-decoration: underline;
text-underline-offset: 4px;
text-decoration-thickness: 1px;

/* Hover */
color: var(--forest-deep);
text-decoration-thickness: 2px;
```

### Cards

```css
background: var(--pure-white);
border-radius: 8px;
padding: var(--space-6);
box-shadow: 0 2px 8px rgba(26, 58, 46, 0.08);
border: 1px solid var(--mist-light);
transition: transform 0.3s ease, box-shadow 0.3s ease;

/* Hover */
transform: translateY(-4px);
box-shadow: 0 8px 24px rgba(26, 58, 46, 0.12);
```

### Links

```css
color: var(--moss-main);
text-decoration: none;
border-bottom: 2px solid var(--fern-bright);
transition: border-color 0.2s ease;

/* Hover */
border-bottom-color: var(--forest-deep);
```

### Form Inputs

```css
background: var(--pure-white);
border: 2px solid var(--mist-light);
border-radius: 4px;
padding: var(--space-3) var(--space-4);
font-family: var(--font-body);
font-size: var(--text-base);
color: var(--stone-dark);
transition: border-color 0.2s ease, box-shadow 0.2s ease;

/* Focus */
border-color: var(--moss-main);
box-shadow: 0 0 0 3px rgba(45, 90, 74, 0.1);
outline: none;
```

---

## Borders & Radius

```css
--radius-sm: 4px;      /* Buttons, inputs */
--radius-md: 8px;      /* Cards, containers */
--radius-lg: 12px;     /* Large cards, modals */
--radius-xl: 16px;     /* Hero sections */
--radius-full: 9999px; /* Pills, avatars */

--border-thin: 1px;
--border-medium: 2px;
--border-thick: 3px;
```

---

## Shadows

Soft, natural shadows that suggest depth without harshness:

```css
--shadow-sm: 0 1px 2px rgba(26, 58, 46, 0.05);
--shadow-base: 0 2px 8px rgba(26, 58, 46, 0.08);
--shadow-md: 0 4px 12px rgba(26, 58, 46, 0.1);
--shadow-lg: 0 8px 24px rgba(26, 58, 46, 0.12);
--shadow-xl: 0 16px 48px rgba(26, 58, 46, 0.15);
```

---

## Effects & Textures

### Subtle Background Texture

Add organic feel with CSS noise:
```css
background-image: 
  url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
```

### Gradient Overlays (Subtle)

```css
/* Soft atmospheric gradient for hero sections */
background: linear-gradient(
  135deg,
  var(--cloud-white) 0%,
  var(--sky-pale) 50%,
  var(--mist-light) 100%
);

/* Accent gradient for CTAs */
background: linear-gradient(
  135deg,
  var(--moss-main) 0%,
  var(--sage-medium) 100%
);
```

### Frosted Glass Effect (For Overlays)

```css
background: rgba(247, 249, 248, 0.85);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(107, 143, 113, 0.1);
```

---

## Animations & Transitions

### Timing Functions

```css
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);     /* Standard ease */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy spring */
--ease-natural: cubic-bezier(0.25, 0.46, 0.45, 0.94); /* Natural motion */
```

### Duration

```css
--duration-fast: 150ms;      /* Micro-interactions */
--duration-base: 300ms;      /* Standard transitions */
--duration-slow: 500ms;      /* Dramatic effects */
--duration-slower: 800ms;    /* Page load animations */
```

### Common Animations

**Fade In Up:**
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Gentle Float (for hover):**
```css
@keyframes gentleFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
```

**Scale Pulse (for attention):**
```css
@keyframes scalePulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
```

---

## Iconography

**Style:** Line icons with 2px stroke, rounded caps
**Size Scale:**
```css
--icon-xs: 16px;
--icon-sm: 20px;
--icon-base: 24px;
--icon-lg: 32px;
--icon-xl: 48px;
```

**Recommended Icon Set:** Lucide Icons or Phosphor Icons (both offer nature-inspired options and clean line styles)

---

## Accessibility

### Contrast Ratios
- Body text on white background: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- All interactive elements: clearly distinguishable states

### Focus States
```css
:focus-visible {
  outline: 2px solid var(--moss-main);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Usage Examples

### Hero Section
```html
<section class="hero">
  <h1>Your Name</h1>
  <p class="intro">Crafting digital experiences with purpose</p>
  <button class="primary-btn">View Work</button>
</section>
```

```css
.hero {
  background: linear-gradient(135deg, var(--cloud-white) 0%, var(--sky-pale) 100%);
  padding: var(--space-16) var(--space-6);
  text-align: center;
  position: relative;
}

.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("noise texture");
  opacity: 0.03;
  pointer-events: none;
}

.hero h1 {
  font-family: var(--font-display);
  font-size: var(--text-5xl);
  color: var(--forest-deep);
  font-weight: var(--weight-bold);
  margin-bottom: var(--space-4);
  animation: fadeInUp var(--duration-slow) var(--ease-natural);
}

.hero .intro {
  font-size: var(--text-xl);
  color: var(--stone-medium);
  margin-bottom: var(--space-8);
  animation: fadeInUp var(--duration-slow) var(--ease-natural) 0.2s;
  animation-fill-mode: both;
}
```

### Project Card
```html
<article class="project-card">
  <div class="project-image">
    <img src="project.jpg" alt="Project name">
  </div>
  <div class="project-content">
    <h3>Project Title</h3>
    <p>Brief description of the project...</p>
    <a href="#" class="project-link">View Project →</a>
  </div>
</article>
```

```css
.project-card {
  background: var(--pure-white);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-base);
  transition: transform var(--duration-base) var(--ease-smooth),
              box-shadow var(--duration-base) var(--ease-smooth);
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.project-image {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.project-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--duration-slow) var(--ease-smooth);
}

.project-card:hover .project-image img {
  transform: scale(1.05);
}

.project-content {
  padding: var(--space-6);
}

.project-content h3 {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  color: var(--forest-deep);
  margin-bottom: var(--space-3);
}

.project-content p {
  color: var(--stone-medium);
  line-height: var(--leading-normal);
  margin-bottom: var(--space-5);
}

.project-link {
  color: var(--moss-main);
  font-weight: var(--weight-semibold);
  text-decoration: none;
  border-bottom: 2px solid var(--fern-bright);
  transition: border-color var(--duration-fast) var(--ease-smooth);
}

.project-link:hover {
  border-bottom-color: var(--forest-deep);
}
```

---

## Implementation Notes

### Loading Fonts
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### CSS Variables Setup
```css
:root {
  /* Copy all variables from above sections */
  /* Color Mode Support */
  color-scheme: light;
}

/* Optional: Dark mode (if needed later) */
@media (prefers-color-scheme: dark) {
  :root {
    /* Invert colors for dark mode */
  }
}
```

---

## Design Principles Summary

1. **Breath before Detail**: Let content breathe with generous spacing
2. **Natural over Artificial**: Organic curves, soft shadows, muted tones
3. **Purposeful Motion**: Animations enhance understanding, never distract
4. **Hierarchy through Type**: Use font families and sizes to guide the eye
5. **Subtle Texture**: Background grain and soft gradients add depth without noise
6. **Green as Foundation**: Let greens dominate, earth tones accent
7. **Asymmetric Balance**: Create visual interest while maintaining harmony

---

*This design system creates a portfolio that feels like a calm walk through a forest clearing—modern, intentional, and refreshingly grounded.*
