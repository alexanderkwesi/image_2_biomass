// utils/ResponsiveUtils.js
export default class ResponsiveUtils {
  static isMobile(width) {
    return width < 768;
  }

  static isTablet(width) {
    return width >= 768 && width < 1024;
  }

  static isDesktop(width) {
    return width >= 1024;
  }

  static getColumnCount(width) {
    if (width >= 1440) return 4;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
  }
}
