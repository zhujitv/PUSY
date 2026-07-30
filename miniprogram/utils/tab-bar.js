function refreshCustomTabBar() {
  try {
    if (typeof getCurrentPages !== "function") return;
    const pages = getCurrentPages();
    const page = pages[pages.length - 1];
    if (!page || typeof page.getTabBar !== "function") return;
    const tabBar = page.getTabBar();
    if (tabBar && typeof tabBar.refresh === "function") tabBar.refresh();
  } catch (error) {
    // The custom tab bar may not be attached during the earliest launch phase.
  }
}

module.exports = { refreshCustomTabBar };
