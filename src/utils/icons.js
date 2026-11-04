import {
  faPerson, faPersonDress, faChild, faBaby, faCrown, faChampagneGlasses, faBriefcase,
  faPersonRunning, faShirt, faWandMagicSparkles, faTag,
} from '@fortawesome/free-solid-svg-icons';

/** Correspondance nom d'icône (stocké en base) → icône Font Awesome. */
const CATEGORY_ICONS = {
  person: faPerson,
  'person-dress': faPersonDress,
  child: faChild,
  baby: faBaby,
  crown: faCrown,
  'champagne-glasses': faChampagneGlasses,
  briefcase: faBriefcase,
  'person-running': faPersonRunning,
  shirt: faShirt,
  'wand-magic-sparkles': faWandMagicSparkles,
};

export const categoryIcon = (name) => CATEGORY_ICONS[name] || faTag;
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);
