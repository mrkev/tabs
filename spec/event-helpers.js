/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const buildMouseEvent = function(type, target, param) {
  if (param == null) { param = {}; }
  const {which, ctrlKey} = param;
  const event = new MouseEvent(type, {bubbles: true, cancelable: true});
  if (which != null) { Object.defineProperty(event, 'which', {get() { return which; }}); }
  if (ctrlKey != null) { Object.defineProperty(event, 'ctrlKey', {get() { return ctrlKey; }}); }
  Object.defineProperty(event, 'target', {get() { return target; }});
  Object.defineProperty(event, 'srcObject', {get() { return target; }});
  spyOn(event, "preventDefault");
  return event;
};

module.exports.triggerMouseEvent = function(type, target, param) {
  if (param == null) { param = {}; }
  const {which, ctrlKey} = param;
  const event = buildMouseEvent(...arguments);
  target.dispatchEvent(event);
  return event;
};

module.exports.triggerClickEvent = function(target, options) {
  const events = {
    mousedown: buildMouseEvent('mousedown', target, options),
    mouseup: buildMouseEvent('mouseup', target, options),
    click: buildMouseEvent('click', target, options)
  };

  target.dispatchEvent(events.mousedown);
  target.dispatchEvent(events.mouseup);
  target.dispatchEvent(events.click);

  return events;
};

module.exports.buildDragEvents = function(dragged, dropTarget) {
  const dataTransfer = {
    data: {},
    setData(key, value) { return this.data[key] = `${value}`; }, // Drag events stringify data values
    getData(key) { return this.data[key]; }
  };

  Object.defineProperty(
    dataTransfer,
    'items', {
    get() {
      return Object.keys(dataTransfer.data).map(key => ({type: key}));
    }
  }
  );

  const dragStartEvent = buildMouseEvent("dragstart", dragged);
  Object.defineProperty(dragStartEvent, 'dataTransfer', {get() { return dataTransfer; }});

  const dropEvent = buildMouseEvent("drop", dropTarget);
  Object.defineProperty(dropEvent, 'dataTransfer', {get() { return dataTransfer; }});

  return [dragStartEvent, dropEvent];
};

module.exports.buildWheelEvent = delta => new WheelEvent("mousewheel", {wheelDeltaY: delta});

module.exports.buildWheelPlusShiftEvent = delta => new WheelEvent("mousewheel", {wheelDeltaY: delta, shiftKey: true});
