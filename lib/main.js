/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { CompositeDisposable, Disposable } = require("atom");
const getIconServices = require("./get-icon-services");
const layout = require("./layout");
const TabBarView = require("./tab-bar-view");
const MRUListView = require("./mru-list-view");
const _ = require("underscore-plus");

module.exports = {
  activate(state) {
    let left;
    this.subscriptions = new CompositeDisposable();
    layout.activate();
    this.tabBarViews = [];
    this.mruListViews = [];

    const keyBindSource = "tabs package";
    const enableMruConfigKey = "tabs.enableMruTabSwitching";

    this.updateTraversalKeybinds = function() {
      // We don't modify keybindings based on our setting if the user has already tweaked them.
      let bindings = atom.keymaps.findKeyBindings({
        target: document.body,
        keystrokes: "ctrl-tab"
      });
      if (bindings.length > 1 && bindings[0].source !== keyBindSource) {
        return;
      }
      bindings = atom.keymaps.findKeyBindings({
        target: document.body,
        keystrokes: "ctrl-shift-tab"
      });
      if (bindings.length > 1 && bindings[0].source !== keyBindSource) {
        return;
      }

      if (atom.config.get(enableMruConfigKey)) {
        return atom.keymaps.removeBindingsFromSource(keyBindSource);
      } else {
        const disabledBindings = {
          body: {
            "ctrl-tab": "pane:show-next-item",
            "ctrl-tab ^ctrl": "unset!",
            "ctrl-shift-tab": "pane:show-previous-item",
            "ctrl-shift-tab ^ctrl": "unset!"
          }
        };
        return atom.keymaps.add(keyBindSource, disabledBindings, 0);
      }
    };

    this.subscriptions.add(
      atom.config.observe(enableMruConfigKey, () =>
        this.updateTraversalKeybinds()
      )
    );
    this.subscriptions.add(
      typeof atom.keymaps.onDidLoadUserKeymap === "function"
        ? atom.keymaps.onDidLoadUserKeymap(() => this.updateTraversalKeybinds())
        : undefined
    );

    // If the command bubbles up without being handled by a particular pane,
    // close all tabs in all panes
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "tabs:close-all-tabs": () => {
          // We loop backwards because the panes are
          // removed from the array as we go
          return (() => {
            const result = [];
            for (let i = this.tabBarViews.length - 1; i >= 0; i--) {
              const tabBarView = this.tabBarViews[i];
              result.push(tabBarView.closeAllTabs());
            }
            return result;
          })();
        }
      })
    );

    const paneContainers = {
      center:
        (left =
          typeof atom.workspace.getCenter === "function"
            ? atom.workspace.getCenter()
            : undefined) != null
          ? left
          : atom.workspace,
      left:
        typeof atom.workspace.getLeftDock === "function"
          ? atom.workspace.getLeftDock()
          : undefined,
      right:
        typeof atom.workspace.getRightDock === "function"
          ? atom.workspace.getRightDock()
          : undefined,
      bottom:
        typeof atom.workspace.getBottomDock === "function"
          ? atom.workspace.getBottomDock()
          : undefined
    };

    return Object.keys(paneContainers).forEach(location => {
      const container = paneContainers[location];
      if (!container) {
        return;
      }
      return this.subscriptions.add(
        container.observePanes(pane => {
          const tabBarView = new TabBarView(pane, location);
          const mruListView = new MRUListView();
          mruListView.initialize(pane);

          const paneElement = pane.getElement();
          paneElement.insertBefore(tabBarView.element, paneElement.firstChild);

          this.tabBarViews.push(tabBarView);
          pane.onDidDestroy(() => _.remove(this.tabBarViews, tabBarView));
          this.mruListViews.push(mruListView);
          return pane.onDidDestroy(() =>
            _.remove(this.mruListViews, mruListView)
          );
        })
      );
    });
  },

  deactivate() {
    layout.deactivate();
    this.subscriptions.dispose();
    if (this.fileIconsDisposable != null) {
      this.fileIconsDisposable.dispose();
    }
    for (let tabBarView of Array.from(this.tabBarViews)) {
      tabBarView.destroy();
    }
    for (let mruListView of Array.from(this.mruListViews)) {
      mruListView.destroy();
    }
  },

  consumeElementIcons(service) {
    getIconServices().setElementIcons(service);
    this.updateFileIcons();
    return new Disposable(() => {
      getIconServices().resetElementIcons();
      return this.updateFileIcons();
    });
  },

  consumeFileIcons(service) {
    getIconServices().setFileIcons(service);
    this.updateFileIcons();
    return new Disposable(() => {
      getIconServices().resetFileIcons();
      return this.updateFileIcons();
    });
  },

  updateFileIcons() {
    return Array.from(this.tabBarViews).map(tabBarView =>
      Array.from(tabBarView.getTabs()).map(tabView => tabView.updateIcon())
    );
  }
};
