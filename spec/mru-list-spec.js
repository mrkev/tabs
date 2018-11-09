/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs = require("fs-plus");
const path = require("path");
const temp = require("temp").track();

describe("MRU List", function() {
  let workspaceElement = null;
  const enableMruConfigKey = "tabs.enableMruTabSwitching";
  const displayMruTabListConfigKey = "tabs.displayMruTabList";

  beforeEach(function() {
    workspaceElement = atom.workspace.getElement();

    waitsForPromise(() => atom.workspace.open("sample.js"));

    return waitsForPromise(() => atom.packages.activatePackage("tabs"));
  });

  describe(".activate()", function() {
    const initialPaneCount = atom.workspace.getPanes().length;

    it("has exactly one modal panel per pane", function() {
      expect(
        workspaceElement.querySelectorAll(".tabs-mru-switcher").length
      ).toBe(initialPaneCount);

      let pane = atom.workspace.getActivePane();
      pane.splitRight();
      expect(
        workspaceElement.querySelectorAll(".tabs-mru-switcher").length
      ).toBe(initialPaneCount + 1);

      pane = atom.workspace.getActivePane();
      pane.splitDown();
      expect(
        workspaceElement.querySelectorAll(".tabs-mru-switcher").length
      ).toBe(initialPaneCount + 2);

      waitsForPromise(function() {
        pane = atom.workspace.getActivePane();
        return Promise.resolve(pane.close());
      });

      runs(() =>
        expect(
          workspaceElement.querySelectorAll(".tabs-mru-switcher").length
        ).toBe(initialPaneCount + 1)
      );

      waitsForPromise(function() {
        pane = atom.workspace.getActivePane();
        return Promise.resolve(pane.close());
      });

      return runs(() =>
        expect(
          workspaceElement.querySelectorAll(".tabs-mru-switcher").length
        ).toBe(initialPaneCount)
      );
    });

    it("Doesn't build list until activated for the first time", function() {
      expect(
        workspaceElement.querySelectorAll(".tabs-mru-switcher").length
      ).toBe(initialPaneCount);
      return expect(
        workspaceElement.querySelectorAll(".tabs-mru-switcher li").length
      ).toBe(0);
    });

    return it("Doesn't activate when a single pane item is open", function() {
      const pane = atom.workspace.getActivePane();
      atom.commands.dispatch(pane, "pane:show-next-recently-used-item");
      return expect(
        workspaceElement.querySelectorAll(".tabs-mru-switcher li").length
      ).toBe(0);
    });
  });

  describe("contents", function() {
    let pane = null;
    const realSetTimeout = window.setTimeout;

    beforeEach(function() {
      // The MRU tab list is deliberately delayed before display.
      // Here we mock window.setTimeout rather than introducing a corresponding delay in tests
      // because faster tests are better.
      jasmine.getGlobal().setTimeout = (callback, wait) => callback();
      waitsForPromise(() => atom.workspace.open("sample.png"));
      return (pane = atom.workspace.getActivePane());
    });

    afterEach(() => (jasmine.getGlobal().setTimeout = realSetTimeout));

    it("has one item per tab", function() {
      if (pane.onChooseNextMRUItem != null) {
        expect(pane.getItems().length).toBe(2);
        atom.commands.dispatch(
          workspaceElement,
          "pane:show-next-recently-used-item"
        );
        return expect(
          workspaceElement.querySelectorAll(".tabs-mru-switcher li").length
        ).toBe(2);
      }
    });

    it("switches between two items", function() {
      const firstActiveItem = pane.getActiveItem();
      atom.commands.dispatch(
        workspaceElement,
        "pane:show-next-recently-used-item"
      );
      const secondActiveItem = pane.getActiveItem();
      expect(secondActiveItem).toNotBe(firstActiveItem);
      atom.commands.dispatch(
        workspaceElement,
        "pane:move-active-item-to-top-of-stack"
      );
      const thirdActiveItem = pane.getActiveItem();
      expect(thirdActiveItem).toBe(secondActiveItem);
      atom.commands.dispatch(
        workspaceElement,
        "pane:show-next-recently-used-item"
      );
      atom.commands.dispatch(
        workspaceElement,
        "pane:move-active-item-to-top-of-stack"
      );
      const fourthActiveItem = pane.getActiveItem();
      return expect(fourthActiveItem).toBe(firstActiveItem);
    });

    return it("disables display when configured to", function() {
      atom.config.set(displayMruTabListConfigKey, false);
      expect(atom.config.get(displayMruTabListConfigKey)).toBe(false);
      if (pane.onChooseNextMRUItem != null) {
        expect(pane.getItems().length).toBe(2);
        atom.commands.dispatch(
          workspaceElement,
          "pane:show-next-recently-used-item"
        );
        return expect(
          workspaceElement.querySelectorAll(".tabs-mru-switcher li").length
        ).toBe(0);
      }
    });
  });

  return describe("config", function() {
    let dotAtomPath = null;

    beforeEach(function() {
      dotAtomPath = temp.path("tabs-spec-mru-config");
      atom.config.configDirPath = dotAtomPath;
      atom.config.configFilePath = path.join(
        atom.config.configDirPath,
        "atom.config.cson"
      );
      return (atom.keymaps.configDirPath = dotAtomPath);
    });

    afterEach(() => fs.removeSync(dotAtomPath));

    it("defaults on", function() {
      expect(atom.config.get(enableMruConfigKey)).toBe(true);
      expect(atom.config.get(displayMruTabListConfigKey)).toBe(true);

      let bindings = atom.keymaps.findKeyBindings({
        target: document.body,
        keystrokes: "ctrl-tab"
      });
      expect(bindings.length).toBe(1);
      expect(bindings[0].command).toBe("pane:show-next-recently-used-item");

      bindings = atom.keymaps.findKeyBindings({
        target: document.body,
        keystrokes: "ctrl-tab ^ctrl"
      });
      expect(bindings.length).toBe(1);
      expect(bindings[0].command).toBe("pane:move-active-item-to-top-of-stack");

      bindings = atom.keymaps.findKeyBindings({
        target: document.body,
        keystrokes: "ctrl-shift-tab"
      });
      expect(bindings.length).toBe(1);
      expect(bindings[0].command).toBe("pane:show-previous-recently-used-item");

      bindings = atom.keymaps.findKeyBindings({
        target: document.body,
        keystrokes: "ctrl-shift-tab ^ctrl"
      });
      expect(bindings.length).toBe(1);
      return expect(bindings[0].command).toBe(
        "pane:move-active-item-to-top-of-stack"
      );
    });

    return it("alters keybindings when disabled", function() {
      atom.config.set(enableMruConfigKey, false);
      let bindings = atom.keymaps.findKeyBindings({
        target: document.body,
        keystrokes: "ctrl-tab"
      });
      expect(bindings.length).toBe(2);
      expect(bindings[0].command).toBe("pane:show-next-item");

      bindings = atom.keymaps.findKeyBindings({
        target: document.body,
        keystrokes: "ctrl-tab ^ctrl"
      });
      expect(bindings.length).toBe(2);
      expect(bindings[0].command).toBe("unset!");

      bindings = atom.keymaps.findKeyBindings({
        target: document.body,
        keystrokes: "ctrl-shift-tab"
      });
      expect(bindings.length).toBe(2);
      expect(bindings[0].command).toBe("pane:show-previous-item");

      bindings = atom.keymaps.findKeyBindings({
        target: document.body,
        keystrokes: "ctrl-shift-tab ^ctrl"
      });
      expect(bindings.length).toBe(2);
      return expect(bindings[0].command).toBe("unset!");
    });
  });
});
