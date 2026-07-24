const defaultColors = require('./colors.default');
const defaultFonts = require('./fonts.default');
const defaultBorders = require('./borders.default');

function parseColor(colorName) {
  return ({ opacityVariable, opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(--${colorName}, ${defaultColors[colorName]}), ${opacityValue})`;
    }
    if (opacityVariable !== undefined) {
      return `rgba(var(--${colorName}, ${defaultColors[colorName]}), var(${opacityVariable}, 1))`;
    }
    return `rgb(var(--${colorName}))`;
  };
}

// const safelist = [
//   {
//     pattern: new RegExp(`.+-(${Object.keys(defaultColors).join('|')})$`)
//   }
// ];

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "../public/views/partials/**/*.liquid",
    "../../**/public/views/pages/**/*.liquid",
    "../../**/public/views/partials/**/*.liquid",
    "./scripts/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['var(--pos-fonts-default)', ...defaultFonts.default]
      },
      colors: {
        'prominent': parseColor('prominent'),
        'normal': parseColor('normal'),
        'supplementary': parseColor('supplementary'),
        'graphic': parseColor('graphic'),
        'inverted': parseColor('inverted'),
        'interactive-graphic': parseColor('interactive-graphic'),
        'interactive-text': parseColor('interactive-text'),
        'interactive-hover': parseColor('interactive-hover'),
        'interactive-disabled': parseColor('interactive-disabled'),
        'colorful': parseColor('colorful'),
        'colorful-hover': parseColor('colorful-hover'),
        'colorful-foreground': parseColor('colorful-foreground'),
        'colorful-supplementary': parseColor('colorful-supplementary'),
        'gradient1-from': parseColor('gradient1-from'),
        'gradient1-to': parseColor('gradient1-to'),
        'gradient2-from': parseColor('gradient2-from'),
        'gradient2-to': parseColor('gradient2-to'),
        'panel': parseColor('panel'),
        'card-shadow': parseColor('card-shadow'),
        'base': parseColor('base'),
        'highlighted': parseColor('highlighted'),
        'divider': parseColor('divider'),
        'input': parseColor('input'),
        'input-border': parseColor('input-border'),
        'input-foreground': parseColor('input-foreground'),
        'button-primary': parseColor('button-primary'),
        'button-primary-hover': parseColor('button-primary-hover'),
        'button-primary-foreground': parseColor('button-primary-foreground'),
        'button-primary-foreground-hover': parseColor('button-primary-foreground-hover'),
        'button-secondary-background': parseColor('button-secondary-background'),
        'button-primary-stroke': parseColor('button-primary-stroke'),
        'button-primary-stroke-hover': parseColor('button-primary-stroke-hover'),
        'button-secondary': parseColor('button-secondary'),
        'button-secondary-hover': parseColor('button-secondary-hover'),
        'button-secondary-foreground': parseColor('button-secondary-foreground'),
        'button-secondary-foreground-hover': parseColor('button-secondary-foreground-hover'),
        'button-secondary-stroke': parseColor('button-secondary-stroke'),
        'button-secondary-stroke-hover': parseColor('button-secondary-stroke-hover'),
        'important': parseColor('important'),
        'important-hover': parseColor('important-hover'),
        'important-disabled': parseColor('important-disabled'),
        'confirmation': parseColor('confirmation'),
        'confirmation-hover': parseColor('confirmation-hover'),
        'confirmation-disabled': parseColor('confirmation-disabled'),
        'warning': parseColor('warning'),
        'warning-hover': parseColor('warning-hover'),
        'warning-disabled': parseColor('warning-disabled')
      },
      borderColor: {
        DEFAULT: parseColor('divider')
      },
      boxShadow: {
        'card': `0px 0px 5px rgba(${defaultColors['shadow']}, .1)`,
        'large': `0px 10px 30px rgba(${defaultColors['shadow']}, .3)`
      },
      ringWidth: {
        '1': '1px',
      },
      borderRadius: {
        'surface': `var(--radius-surface, ${defaultBorders.radiuses['radius-surface']})`,
        'button': `var(--radius-button, ${defaultBorders.radiuses['radius-button']})`,
        'input': `var(--radius-input, ${defaultBorders.radiuses['radius-input']})`
      },
      borderWidth: {
        'secondary': `var(--border-width-secondary, ${defaultBorders.width['width-secondary']})`
      }
    },
  },
  // safelist,
  plugins: [
    require('@tailwindcss/typography')
  ],
};
