/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS201: Simplify complex destructure assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = {
  activate() {
    this.view = document.createElement("div");
    atom.workspace.getElement().appendChild(this.view);
    return this.view.classList.add("tabs-layout-overlay");
  },

  deactivate() {
    return this.view.parentElement != null
      ? this.view.parentElement.removeChild(this.view)
      : undefined;
  },

  test: {},

  drag(e) {
    this.lastCoords = e;
    const pane = this.getPaneAt(e);
    const itemView = this.getItemViewAt(e);
    const { item } = e.target;
    if (
      pane != null &&
      itemView != null &&
      item &&
      itemIsAllowedInPane(item, pane)
    ) {
      const coords = !(
        this.isOnlyTabInPane(pane, e.target) || pane.getItems().length === 0
      )
        ? [e.clientX, e.clientY]
        : undefined;
      return (this.lastSplit = this.updateView(itemView, coords));
    } else {
      return this.disableView();
    }
  },

  end(e) {
    this.disableView();
    if (this.lastCoords == null || !this.getItemViewAt(this.lastCoords)) {
      return;
    }
    const target = this.getPaneAt(this.lastCoords);
    if (target == null) {
      return;
    }
    const tab = e.target;
    const fromPane = tab.pane;
    const { item } = tab;
    if (!itemIsAllowedInPane(item, toPane != null ? toPane : target)) {
      return;
    }
    var toPane = (() => {
      switch (this.lastSplit) {
        case "left":
          return target.splitLeft();
        case "right":
          return target.splitRight();
        case "up":
          return target.splitUp();
        case "down":
          return target.splitDown();
      }
    })();
    if (toPane == null) {
      toPane = target;
    }
    if (toPane === fromPane) {
      return;
    }
    fromPane.moveItemToPane(item, toPane);
    toPane.activateItem(item);
    return toPane.activate();
  },

  getElement({ clientX, clientY }, selector) {
    if (selector == null) {
      selector = "*";
    }
    return document.elementFromPoint(clientX, clientY).closest(selector);
  },

  getItemViewAt(coords) {
    return this.test.itemView || this.getElement(coords, ".item-views");
  },

  getPaneAt(coords) {
    return (
      this.test.pane ||
      __guard__(this.getElement(this.lastCoords, "atom-pane"), x =>
        x.getModel()
      )
    );
  },

  isOnlyTabInPane(pane, tab) {
    return pane.getItems().length === 1 && pane === tab.pane;
  },

  normalizeCoords({ left, top, width, height }, ...rest) {
    const [x, y] = Array.from(rest[0]);
    return [(x - left) / width, (y - top) / height];
  },

  splitType(...args) {
    const [x, y] = Array.from(args[0]);
    if (x < 1 / 3) {
      return "left";
    } else if (x > 2 / 3) {
      return "right";
    } else if (y < 1 / 3) {
      return "up";
    } else if (y > 2 / 3) {
      return "down";
    }
  },

  boundsForSplit(split) {
    let h, ref, w, x, y;
    return (
      ([x, y, w, h] = Array.from(
        (ref = (() => {
          switch (split) {
            case "left":
              return [0, 0, 0.5, 1];
            case "right":
              return [0.5, 0, 0.5, 1];
            case "up":
              return [0, 0, 1, 0.5];
            case "down":
              return [0, 0.5, 1, 0.5];
            default:
              return [0, 0, 1, 1];
          }
        })())
      )),
      ref
    );
  },

  innerBounds({ left, top, width, height }, ...rest) {
    const [x, y, w, h] = Array.from(rest[0]);
    left += x * width;
    top += y * height;
    width *= w;
    height *= h;
    return { left, top, width, height };
  },

  updateViewBounds({ left, top, width, height }) {
    this.view.style.left = `${left}px`;
    this.view.style.top = `${top}px`;
    this.view.style.width = `${width}px`;
    return (this.view.style.height = `${height}px`);
  },

  updateView(pane, coords) {
    this.view.classList.add("visible");
    const rect = this.test.rect || pane.getBoundingClientRect();
    const split = coords
      ? this.splitType(this.normalizeCoords(rect, coords))
      : undefined;
    this.updateViewBounds(this.innerBounds(rect, this.boundsForSplit(split)));
    return split;
  },

  disableView() {
    return this.view.classList.remove("visible");
  }
};

var itemIsAllowedInPane = function(item, pane) {
  let left;
  const allowedLocations =
    typeof item.getAllowedLocations === "function"
      ? item.getAllowedLocations()
      : undefined;
  if (allowedLocations == null) {
    return true;
  }
  const container = pane.getContainer();
  const location =
    (left =
      typeof container.getLocation === "function"
        ? container.getLocation()
        : undefined) != null
      ? left
      : "center";
  return Array.from(allowedLocations).includes(location);
};

function __guard__(value, transform) {
  return typeof value !== "undefined" && value !== null
    ? transform(value)
    : undefined;
}
