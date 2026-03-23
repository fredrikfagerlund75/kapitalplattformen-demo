const PptxGenJS = require('pptxgenjs');

const SLIDE_W = 10;
const SLIDE_H = 5.625;

const hex = c => (c || '').replace('#', '');

async function generatePPTX(slides, brand) {
  const pres = new PptxGenJS();
  pres.layout  = 'LAYOUT_16x9';
  pres.author  = brand.company_name;
  pres.subject = 'Pitch Deck / Teaser';

  const C = {
    primary:   hex(brand.color_primary   || '#1E2761'),
    secondary: hex(brand.color_secondary || '#185FA5'),
    accent:    hex(brand.color_accent    || '#1D9E75'),
    white:     'FFFFFF',
    dark:      '1A1A2E',
    lightBg:   'F4F6FB',
    textMuted: '6B7280',
  };

  const fontH = brand.font_heading || 'Georgia';
  const fontB = brand.font_body    || 'Calibri';

  const heroImages = brand.hero_images || [];

  const sorted = [...slides].sort((a, b) => a.order - b.order);
  for (const slide of sorted) {
    switch (slide.type) {
      case 'cover':   renderCover(pres, slide, C, fontH, fontB, brand, heroImages);   break;
      case 'bullets': renderBullets(pres, slide, C, fontH, fontB, brand, heroImages); break;
      case 'twocol':  renderTwoCol(pres, slide, C, fontH, fontB, brand, heroImages);  break;
      case 'metrics': renderMetrics(pres, slide, C, fontH, fontB, brand, heroImages); break;
      default:        renderBullets(pres, slide, C, fontH, fontB, brand, heroImages);
    }
  }

  return await pres.write({ outputType: 'nodebuffer' });
}

function addLogo(slide, brand, dark = false) {
  const url = dark ? (brand.logo_dark_url || brand.logo_url) : brand.logo_url;
  if (!url) return;
  try {
    slide.addImage({ path: url, x: 0.3, y: 0.15, w: 1.5, h: 0.45, sizing: { type: 'contain', w: 1.5, h: 0.45 } });
  } catch { /* logotyp ej tillgänglig — hoppa över */ }
}

function addFooter(slide, C, fontB, pageNum, total) {
  slide.addText(
    `Konfidentiellt — ej för vidaredistribution  |  ${pageNum} / ${total}`,
    { x: 0.3, y: 5.35, w: 9.4, h: 0.2, fontSize: 7, color: C.textMuted, fontFace: fontB, align: 'center' }
  );
}

function renderCover(pres, slide, C, fontH, fontB, brand, heroImages) {
  const s = pres.addSlide();
  const heroUrl = heroImages[0];

  if (heroUrl) {
    s.addImage({
      path: heroUrl,
      x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
      sizing: { type: 'cover', w: SLIDE_W, h: SLIDE_H }
    });
    s.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
      fill: { color: C.primary, transparency: 40 },
      line: { color: C.primary, transparency: 40 }
    });
  } else {
    s.background = { color: C.primary };
  }

  addLogo(s, brand, true);

  const c = slide.content;
  s.addText(c.company_name || brand.company_name, {
    x: 0.6, y: 1.3, w: 8.8, h: 1.0,
    fontSize: 40, bold: true, color: C.white, fontFace: fontH, align: 'center'
  });
  s.addText(c.tagline || brand.tagline || '', {
    x: 0.6, y: 2.45, w: 8.8, h: 0.65,
    fontSize: 16, color: 'D0D8F0', fontFace: fontB, align: 'center', italic: true
  });

  if (c.emission_amount) {
    s.addShape(pres.ShapeType.roundRect, {
      x: 3.0, y: 3.3, w: 4.0, h: 0.55,
      fill: { color: C.secondary }, line: { color: C.secondary }
    });
    s.addText(`${c.emission_type || 'Emission'}  ·  ${c.emission_amount}  ·  ${c.marketplace || ''}`, {
      x: 3.0, y: 3.3, w: 4.0, h: 0.55,
      fontSize: 11, color: C.white, fontFace: fontB, align: 'center', bold: true
    });
  }
}

function renderBullets(pres, slide, C, fontH, fontB, brand, heroImages) {
  const s = pres.addSlide();
  const heroUrl = heroImages.length > 1
    ? heroImages[slide.order % 2]
    : heroImages[0];

  const hasHero = !!heroUrl;
  const textW   = hasHero ? 5.8 : SLIDE_W;

  s.background = { color: C.lightBg };

  if (hasHero) {
    s.addImage({
      path: heroUrl,
      x: 6.05, y: 0.7, w: 3.95, h: SLIDE_H - 0.7,
      sizing: { type: 'cover', w: 3.95, h: SLIDE_H - 0.7 }
    });
    s.addShape(pres.ShapeType.rect, {
      x: 5.98, y: 0.7, w: 0.06, h: SLIDE_H - 0.7,
      fill: { color: C.primary }, line: { color: C.primary }
    });
  }

  addLogo(s, brand, false);

  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0.7, w: textW, h: 0.55,
    fill: { color: C.primary }
  });
  s.addText(slide.title, {
    x: 0.4, y: 0.7, w: textW - 0.5, h: 0.55,
    fontSize: 18, bold: true, color: C.white, fontFace: fontH, valign: 'middle'
  });

  const bullets = (slide.content.bullets || []).slice(0, 5);
  bullets.forEach((b, i) => {
    s.addShape(pres.ShapeType.ellipse, {
      x: 0.35, y: 1.55 + i * 0.60, w: 0.18, h: 0.18,
      fill: { color: C.secondary }, line: { color: C.secondary }
    });
    s.addText(b, {
      x: 0.65, y: 1.48 + i * 0.60, w: textW - 0.8, h: 0.55,
      fontSize: hasHero ? 12 : 13, color: C.dark, fontFace: fontB, valign: 'middle'
    });
  });

  if (slide.content.highlight_box) {
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.35, y: 4.72, w: textW - 0.5, h: 0.45,
      fill: { color: C.accent + '22' }, line: { color: C.accent, pt: 1 }
    });
    s.addText(slide.content.highlight_box, {
      x: 0.35, y: 4.72, w: textW - 0.5, h: 0.45,
      fontSize: 11, bold: true, color: C.accent, fontFace: fontB, align: 'center', valign: 'middle'
    });
  }

  addFooter(s, C, fontB, slide.order, 10);
}

function renderTwoCol(pres, slide, C, fontH, fontB, brand, heroImages) {
  const s = pres.addSlide();
  const heroUrl = heroImages.length > 1
    ? heroImages[(slide.order + 1) % 2]
    : heroImages[0];

  s.background = { color: C.lightBg };

  if (heroUrl) {
    s.addImage({
      path: heroUrl,
      x: 0, y: 0.7, w: SLIDE_W, h: SLIDE_H - 0.7,
      sizing: { type: 'cover', w: SLIDE_W, h: SLIDE_H - 0.7 }
    });
    s.addShape(pres.ShapeType.rect, {
      x: 0, y: 0.7, w: SLIDE_W, h: SLIDE_H - 0.7,
      fill: { color: 'F4F6FB', transparency: 15 },
      line: { color: 'F4F6FB', transparency: 15 }
    });
  }

  addLogo(s, brand, false);

  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0.7, w: SLIDE_W, h: 0.55,
    fill: { color: C.primary }
  });
  s.addText(slide.title, {
    x: 0.4, y: 0.7, w: 9.2, h: 0.55,
    fontSize: 18, bold: true, color: C.white, fontFace: fontH, valign: 'middle'
  });

  const cards = (slide.content.cards || []).slice(0, 4);
  const positions = [
    { x: 0.3,  y: 1.45 }, { x: 5.1,  y: 1.45 },
    { x: 0.3,  y: 3.15 }, { x: 5.1,  y: 3.15 }
  ];
  cards.forEach((card, i) => {
    const p = positions[i];
    s.addShape(pres.ShapeType.roundRect, {
      x: p.x, y: p.y, w: 4.6, h: 1.55,
      fill: { color: C.white, transparency: heroUrl ? 5 : 0 },
      line: { color: 'D1D5DB', pt: 0.5 }
    });
    s.addShape(pres.ShapeType.rect, {
      x: p.x, y: p.y, w: 0.08, h: 1.55,
      fill: { color: C.secondary }, line: { color: C.secondary }
    });
    s.addText(card.title, {
      x: p.x + 0.2, y: p.y + 0.12, w: 4.2, h: 0.35,
      fontSize: 11, bold: true, color: C.primary, fontFace: fontH
    });
    s.addText(card.body, {
      x: p.x + 0.2, y: p.y + 0.5, w: 4.2, h: 0.95,
      fontSize: 9.5, color: C.dark, fontFace: fontB, valign: 'top'
    });
  });

  addFooter(s, C, fontB, slide.order, 10);
}

function renderMetrics(pres, slide, C, fontH, fontB, brand, heroImages) {
  const s = pres.addSlide();
  const heroUrl = heroImages[0];

  s.background = { color: C.lightBg };

  if (heroUrl) {
    s.addImage({
      path: heroUrl,
      x: 0, y: 0.7, w: SLIDE_W, h: SLIDE_H - 0.7,
      sizing: { type: 'cover', w: SLIDE_W, h: SLIDE_H - 0.7 }
    });
    s.addShape(pres.ShapeType.rect, {
      x: 0, y: 0.7, w: SLIDE_W, h: SLIDE_H - 0.7,
      fill: { color: 'F4F6FB', transparency: 8 },
      line: { color: 'F4F6FB', transparency: 8 }
    });
  }

  addLogo(s, brand, false);

  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0.7, w: SLIDE_W, h: 0.55,
    fill: { color: C.primary }
  });
  s.addText(slide.title, {
    x: 0.4, y: 0.7, w: 9.2, h: 0.55,
    fontSize: 18, bold: true, color: C.white, fontFace: fontH, valign: 'middle'
  });

  const metrics = (slide.content.metrics || []).slice(0, 6);
  const cols  = metrics.length <= 4 ? 4 : 3;
  const cardW = cols === 4 ? 2.2 : 2.9;

  metrics.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x   = 0.35 + col * (cardW + 0.2);
    const y   = 1.55 + row * 1.35;

    s.addShape(pres.ShapeType.roundRect, {
      x, y, w: cardW, h: 1.15,
      fill: { color: C.white }, line: { color: 'D1D5DB', pt: 0.5 }
    });
    s.addText(m.value, {
      x, y: y + 0.1, w: cardW, h: 0.65,
      fontSize: 28, bold: true, color: C.secondary, fontFace: fontH, align: 'center'
    });
    s.addText(m.label, {
      x, y: y + 0.75, w: cardW, h: 0.35,
      fontSize: 9, color: C.textMuted, fontFace: fontB, align: 'center'
    });
  });

  addFooter(s, C, fontB, slide.order, 10);
}

module.exports = { generatePPTX };
