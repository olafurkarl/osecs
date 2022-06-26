import { v4 } from 'uuid';

/* eslint-disable @typescript-eslint/no-explicit-any */
class Component {
    id;
    constructor() {
        this.id = v4();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/ban-types
    init(args) {
        // nothing implemented for init by default
        return;
    }
    getId() {
        return this.id;
    }
    setEntity(entity) {
        this.entity = entity;
    }
    getEntity() {
        if (!this.entity) {
            throw new Error("Component tried to fetch it's entity, but none was found");
        }
        return this.entity;
    }
    onComponentRemoved = () => {
        // no-op
    };
    getMask = () => {
        return ComponentMaskMap[this.constructor.name];
    };
}
// TODO: Move this into World
const ComponentMaskMap = {};
function RegisterComponent(constructor) {
    const componentSuffix = 'Component';
    if (!constructor.name.includes(componentSuffix)) {
        throw new Error(`Illegal name of component class. Component name must end in "${componentSuffix}".`);
    }
    const keyName = constructor.name;
    // At some point we might have more than 53 components, in which case we need to be more clever
    // about how we deal with our masks since MAX_SAFE_INTEGER in JS is 2^53
    const componentMaskShift = Object.keys(ComponentMaskMap).length;
    const componentMask = 1 << componentMaskShift;
    ComponentMaskMap[keyName] = componentMask;
}

var domain;
// This constructor is used to store event handlers. Instantiating this is
// faster than explicitly calling `Object.create(null)` to get a "clean" empty
// object (tested with v8 v4.9).
function EventHandlers() { }
EventHandlers.prototype = Object.create(null);
function EventEmitter() {
    EventEmitter.init.call(this);
}
// nodejs oddity
// require('events') === require('events').EventEmitter
EventEmitter.EventEmitter = EventEmitter;
EventEmitter.usingDomains = false;
EventEmitter.prototype.domain = undefined;
EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;
// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;
EventEmitter.init = function () {
    this.domain = null;
    if (EventEmitter.usingDomains) {
        // if there is an active domain, then attach to it.
        if (domain.active ) ;
    }
    if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
        this._events = new EventHandlers();
        this._eventsCount = 0;
    }
    this._maxListeners = this._maxListeners || undefined;
};
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
    if (typeof n !== 'number' || n < 0 || isNaN(n))
        throw new TypeError('"n" argument must be a positive number');
    this._maxListeners = n;
    return this;
};
function $getMaxListeners(that) {
    if (that._maxListeners === undefined)
        return EventEmitter.defaultMaxListeners;
    return that._maxListeners;
}
EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
    return $getMaxListeners(this);
};
// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
    if (isFn)
        handler.call(self);
    else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
            listeners[i].call(self);
    }
}
function emitOne(handler, isFn, self, arg1) {
    if (isFn)
        handler.call(self, arg1);
    else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
            listeners[i].call(self, arg1);
    }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
    if (isFn)
        handler.call(self, arg1, arg2);
    else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
            listeners[i].call(self, arg1, arg2);
    }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
    if (isFn)
        handler.call(self, arg1, arg2, arg3);
    else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
            listeners[i].call(self, arg1, arg2, arg3);
    }
}
function emitMany(handler, isFn, self, args) {
    if (isFn)
        handler.apply(self, args);
    else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
            listeners[i].apply(self, args);
    }
}
EventEmitter.prototype.emit = function emit(type) {
    var er, handler, len, args, i, events, domain;
    var doError = (type === 'error');
    events = this._events;
    if (events)
        doError = (doError && events.error == null);
    else if (!doError)
        return false;
    domain = this.domain;
    // If there is no 'error' event listener then throw.
    if (doError) {
        er = arguments[1];
        if (domain) {
            if (!er)
                er = new Error('Uncaught, unspecified "error" event');
            er.domainEmitter = this;
            er.domain = domain;
            er.domainThrown = false;
            domain.emit('error', er);
        }
        else if (er instanceof Error) {
            throw er; // Unhandled 'error' event
        }
        else {
            // At least give some kind of context to the user
            var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
            err.context = er;
            throw err;
        }
        return false;
    }
    handler = events[type];
    if (!handler)
        return false;
    var isFn = typeof handler === 'function';
    len = arguments.length;
    switch (len) {
        // fast cases
        case 1:
            emitNone(handler, isFn, this);
            break;
        case 2:
            emitOne(handler, isFn, this, arguments[1]);
            break;
        case 3:
            emitTwo(handler, isFn, this, arguments[1], arguments[2]);
            break;
        case 4:
            emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
            break;
        // slower
        default:
            args = new Array(len - 1);
            for (i = 1; i < len; i++)
                args[i - 1] = arguments[i];
            emitMany(handler, isFn, this, args);
    }
    return true;
};
function _addListener(target, type, listener, prepend) {
    var m;
    var events;
    var existing;
    if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
    events = target._events;
    if (!events) {
        events = target._events = new EventHandlers();
        target._eventsCount = 0;
    }
    else {
        // To avoid recursion in the case that type === "newListener"! Before
        // adding it to the listeners, first emit "newListener".
        if (events.newListener) {
            target.emit('newListener', type, listener.listener ? listener.listener : listener);
            // Re-assign `events` because a newListener handler could have caused the
            // this._events to be assigned to a new object
            events = target._events;
        }
        existing = events[type];
    }
    if (!existing) {
        // Optimize the case of one listener. Don't need the extra array object.
        existing = events[type] = listener;
        ++target._eventsCount;
    }
    else {
        if (typeof existing === 'function') {
            // Adding the second element, need to change to array.
            existing = events[type] = prepend ? [listener, existing] :
                [existing, listener];
        }
        else {
            // If we've already got an array, just append.
            if (prepend) {
                existing.unshift(listener);
            }
            else {
                existing.push(listener);
            }
        }
        // Check for listener leak
        if (!existing.warned) {
            m = $getMaxListeners(target);
            if (m && m > 0 && existing.length > m) {
                existing.warned = true;
                var w = new Error('Possible EventEmitter memory leak detected. ' +
                    existing.length + ' ' + type + ' listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit');
                w.name = 'MaxListenersExceededWarning';
                w.emitter = target;
                w.type = type;
                w.count = existing.length;
                emitWarning(w);
            }
        }
    }
    return target;
}
function emitWarning(e) {
    typeof console.warn === 'function' ? console.warn(e) : console.log(e);
}
EventEmitter.prototype.addListener = function addListener(type, listener) {
    return _addListener(this, type, listener, false);
};
EventEmitter.prototype.on = EventEmitter.prototype.addListener;
EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
        return _addListener(this, type, listener, true);
    };
function _onceWrap(target, type, listener) {
    var fired = false;
    function g() {
        target.removeListener(type, g);
        if (!fired) {
            fired = true;
            listener.apply(target, arguments);
        }
    }
    g.listener = listener;
    return g;
}
EventEmitter.prototype.once = function once(type, listener) {
    if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
    this.on(type, _onceWrap(this, type, listener));
    return this;
};
EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
        if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');
        this.prependListener(type, _onceWrap(this, type, listener));
        return this;
    };
// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
        var list, events, position, i, originalListener;
        if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');
        events = this._events;
        if (!events)
            return this;
        list = events[type];
        if (!list)
            return this;
        if (list === listener || (list.listener && list.listener === listener)) {
            if (--this._eventsCount === 0)
                this._events = new EventHandlers();
            else {
                delete events[type];
                if (events.removeListener)
                    this.emit('removeListener', type, list.listener || listener);
            }
        }
        else if (typeof list !== 'function') {
            position = -1;
            for (i = list.length; i-- > 0;) {
                if (list[i] === listener ||
                    (list[i].listener && list[i].listener === listener)) {
                    originalListener = list[i].listener;
                    position = i;
                    break;
                }
            }
            if (position < 0)
                return this;
            if (list.length === 1) {
                list[0] = undefined;
                if (--this._eventsCount === 0) {
                    this._events = new EventHandlers();
                    return this;
                }
                else {
                    delete events[type];
                }
            }
            else {
                spliceOne(list, position);
            }
            if (events.removeListener)
                this.emit('removeListener', type, originalListener || listener);
        }
        return this;
    };
EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
        var listeners, events;
        events = this._events;
        if (!events)
            return this;
        // not listening for removeListener, no need to emit
        if (!events.removeListener) {
            if (arguments.length === 0) {
                this._events = new EventHandlers();
                this._eventsCount = 0;
            }
            else if (events[type]) {
                if (--this._eventsCount === 0)
                    this._events = new EventHandlers();
                else
                    delete events[type];
            }
            return this;
        }
        // emit removeListener for all listeners on all events
        if (arguments.length === 0) {
            var keys = Object.keys(events);
            for (var i = 0, key; i < keys.length; ++i) {
                key = keys[i];
                if (key === 'removeListener')
                    continue;
                this.removeAllListeners(key);
            }
            this.removeAllListeners('removeListener');
            this._events = new EventHandlers();
            this._eventsCount = 0;
            return this;
        }
        listeners = events[type];
        if (typeof listeners === 'function') {
            this.removeListener(type, listeners);
        }
        else if (listeners) {
            // LIFO order
            do {
                this.removeListener(type, listeners[listeners.length - 1]);
            } while (listeners[0]);
        }
        return this;
    };
EventEmitter.prototype.listeners = function listeners(type) {
    var evlistener;
    var ret;
    var events = this._events;
    if (!events)
        ret = [];
    else {
        evlistener = events[type];
        if (!evlistener)
            ret = [];
        else if (typeof evlistener === 'function')
            ret = [evlistener.listener || evlistener];
        else
            ret = unwrapListeners(evlistener);
    }
    return ret;
};
EventEmitter.listenerCount = function (emitter, type) {
    if (typeof emitter.listenerCount === 'function') {
        return emitter.listenerCount(type);
    }
    else {
        return listenerCount.call(emitter, type);
    }
};
EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
    var events = this._events;
    if (events) {
        var evlistener = events[type];
        if (typeof evlistener === 'function') {
            return 1;
        }
        else if (evlistener) {
            return evlistener.length;
        }
    }
    return 0;
}
EventEmitter.prototype.eventNames = function eventNames() {
    return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};
// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
    for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
        list[i] = list[k];
    list.pop();
}
function arrayClone(arr, i) {
    var copy = new Array(i);
    while (i--)
        copy[i] = arr[i];
    return copy;
}
function unwrapListeners(arr) {
    var ret = new Array(arr.length);
    for (var i = 0; i < ret.length; ++i) {
        ret[i] = arr[i].listener || arr[i];
    }
    return ret;
}

class WorldBuilder {
    world;
    constructor() {
        this.world = new World();
    }
    static create() {
        return new WorldBuilder();
    }
    withSystem(system) {
        this.world.addSystem(system);
        return this;
    }
    withSystems(systems) {
        systems.forEach((s) => {
            this.world.addSystem(s);
        });
        return this;
    }
    build() {
        return this.world;
    }
}
class World {
    systems = [];
    static create() {
        return new WorldBuilder();
    }
    addSystem(system) {
        this.systems.push(system);
    }
    run = (delta) => {
        this.sync();
        this.systems.forEach((system) => {
            system.run(delta);
        });
    };
    dirtyAdded = [];
    dirtyRemoved = new Map();
    onComponentAdded(entity) {
        this.dirtyAdded.push(entity);
    }
    onComponentRemoved(record) {
        const key = this.getCleanupKey(record);
        if (!this.dirtyRemoved.has(key)) {
            this.dirtyRemoved.set(key, record);
        }
    }
    getCleanupKey(record) {
        return record.entity.id + record.componentName;
    }
    sync() {
        this.dirtyAdded.forEach(this.syncAdded);
        this.dirtyAdded = [];
        this.dirtyRemoved.forEach(this.syncRemoved);
        this.dirtyRemoved.clear();
    }
    checkAddOrRemove = (entity, s) => checkMask(entity.getComponentMask(), s.getExcludeMask()) &&
        checkMask(s.getAspectMask(), entity.getComponentMask());
    syncAdded = (entity) => {
        this.systems.forEach((s) => {
            const addOrRemove = this.checkAddOrRemove(entity, s);
            if (s.hasEntity(entity) && !addOrRemove) {
                s.unregisterEntity(entity);
            }
            else if (addOrRemove) {
                s.registerEntity(entity);
            }
        });
    };
    syncRemoved = ({ entity, componentName, onRemove }) => {
        onRemove();
        this.systems
            .filter((s) => 
        // Every system that doesn't match the flag, but still has the entity
        !checkMask(s.getAspectMask(), entity.getComponentMask()) &&
            s.hasEntity(entity) &&
            s.hasAspect(componentName))
            .forEach((s) => {
            s.unregisterEntity(entity);
        });
    };
}
const SystemEvents = new EventEmitter();
/**
 *
 * @param mask1 The mask that needs to be met to fulfill the condition
 * @param mask2 The other mask that needs to match up with the first mask
 * @returns Whether the masks match or not
 */
const checkMask = (mask1, mask2) => {
    return (mask1 & mask2) == mask1;
};

var events;
(function (events) {
    events["ENT_DESTROYED"] = "entity destroyed";
    events["ENT_CREATED"] = "entity created";
    events["KINETIC_HIT"] = "kinetic hit";
})(events || (events = {}));
var events$1 = events;

/* eslint-disable @typescript-eslint/ban-types */
/**
 * A base class from which all game entities derive, supports adding and removing {@link Component | Components}
 */
class Entity extends EventEmitter {
    id;
    active = true;
    components;
    parent;
    children = [];
    name = 'unknown';
    world;
    componentMask = 0;
    constructor(world, name) {
        super();
        this.id = v4();
        this.components = new Map();
        this.world = world;
        if (name) {
            this.name = name;
        }
    }
    addComponent(component) {
        this.components.set(component.constructor.name, component);
        if (component.onComponentRemoved) {
            this.once(events$1.ENT_DESTROYED, () => {
                component.onComponentRemoved?.();
            });
        }
        this.world.onComponentAdded(this);
        this.setMaxListeners(this.getMaxListeners() + 1);
        this.componentMask |= ComponentMaskMap[component.constructor.name];
    }
    getComponent(componentClass) {
        let component = this.components.get(componentClass.name);
        if (!component && this.parent) {
            component = this.parent.getComponent(componentClass);
        }
        if (!component) {
            throw new Error(`Component: ${componentClass.name} not found on Entity (name: ${this.name}; id: ${this.id})`);
        }
        return component;
    }
    getComponentNames() {
        return Array.from(this.components.keys());
    }
    getComponentMask() {
        return this.componentMask;
    }
    hasComponent(componentClass) {
        if (componentClass instanceof Component) {
            return this.components.has(componentClass.constructor.name);
        }
        return this.components.has(componentClass.name);
    }
    removeComponent(componentClass) {
        if (this.hasComponent(componentClass)) {
            const removeCallback = () => {
                this.getComponent(componentClass).onComponentRemoved();
                this.components.delete(componentClass.name);
            };
            this.world.onComponentRemoved({
                entity: this,
                componentName: componentClass.name,
                onRemove: removeCallback
            });
            this.componentMask &= ~ComponentMaskMap[componentClass.name];
        }
    }
    equals(other) {
        return this.id === other.id;
    }
    addChild(entity) {
        this.children.push(entity);
    }
    getChildren() {
        return this.children;
    }
    getChildrenWithComponent(componentClass) {
        return this.children.filter((child) => child.hasComponent(componentClass));
    }
    setParent(entity) {
        this.parent = entity;
    }
    getParent() {
        if (!this.parent) {
            throw new Error("Entity tried to fetch it's parent entity, but none was found");
        }
        return this.parent;
    }
    toString() {
        const components = this.getComponentNames();
        components.toString = function () {
            return this.join('; ');
        };
        return `${this.name} entity, id:\n ${this.id},\n components:\n ${components}`;
    }
}
class EntityBuilder {
    entity;
    static create(world, name) {
        return new EntityBuilder(world, name);
    }
    constructor(world, name) {
        this.entity = new Entity(world, name);
    }
    withComponent(component, args) {
        // set entity
        component.setEntity(this.entity);
        // call init after entity has been set
        component.init();
        this.entity.addComponent(component);
        return this;
    }
    withChild(entity) {
        entity.setParent(this.entity);
        this.entity.addChild(entity);
        return this;
    }
    build() {
        // TODO: Move this to the world's events instead (if we're keeping events)
        SystemEvents.emit(events$1.ENT_CREATED, this.entity);
        return this.entity;
    }
}

class System {
    entityIds = new Set();
    entities = [];
    hasEntity(entity) {
        return this.entityIds.has(entity.id);
    }
    registerEntity(entity) {
        if (!this.hasEntity(entity)) {
            this.entities.push(entity);
            this.entityIds.add(entity.id);
            entity.once(events$1.ENT_DESTROYED, (entity) => {
                this.unregisterEntity(entity);
            });
        }
    }
    unregisterEntity(entity) {
        this.entities = this.entities.filter((e) => e.id !== entity.id);
        this.entityIds.delete(entity.id);
    }
    aspectMask;
    excludeMask;
    hasAspect(aspect) {
        return this.hasComponent(aspect, this.aspects());
    }
    hasExclude(exclude) {
        return this.hasComponent(exclude, this.excludes());
    }
    hasComponent(name, array) {
        return array.map((a) => a.name).includes(name);
    }
    getAspectMask() {
        if (!this.aspectMask) {
            this.aspectMask = this.getMask(this.aspects());
        }
        return this.aspectMask;
    }
    getExcludeMask() {
        if (!this.excludeMask) {
            this.excludeMask = ~this.getMask(this.excludes()) >>> 0;
        }
        return this.excludeMask;
    }
    getMask(maskable) {
        return maskable
            .map((a) => ComponentMaskMap[a.name])
            .reduce((prev, curr) => prev | curr, 0);
    }
}

export { Component, Entity, EntityBuilder, RegisterComponent, System, World };
//# sourceMappingURL=index.module.js.map
