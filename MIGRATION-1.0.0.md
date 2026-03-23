# osecs 1.0.0 Migration Guide

osecs 1.0.0 replaces TypeScript's `experimentalDecorators` with the standard TC39 stage 3 decorators. This is a breaking change that requires updates to your component definitions.

## tsconfig.json

Remove `experimentalDecorators` from your `compilerOptions`:

```diff
 {
     "compilerOptions": {
-        "experimentalDecorators": true,
     }
 }
```

## Component field declarations

`declare` can no longer be used on decorated properties. Use `!` (definite assignment assertion) instead:

```diff
 @RegisterComponent
 class Position extends Component {
-    @field declare x: number;
-    @field declare y: number;
+    @field x!: number;
+    @field y!: number;
 }
```

## `@children`, `@parent`, and `@validate`

These decorators now use the `accessor` keyword and **automatically register the field** — `@field` is no longer needed alongside them:

```diff
 @RegisterComponent
 class ParentComponent extends Component {
-    @field @children declare children: Set<Entity>;
+    @children accessor children!: Set<Entity>;
 }

 @RegisterComponent
 class ChildComponent extends Component {
-    @field @parent(ParentComponent, 'children') declare parent: Entity;
+    @parent(ParentComponent, 'children') accessor parent!: Entity;
 }

 @RegisterComponent
 class Rotation extends Component {
-    @field @validate(validateAngle) declare angle: number;
+    @validate(validateAngle) accessor angle!: number;
 }
```

## `@init` and `@initializeAs`

These remain field decorators. Replace `declare` with `!`:

```diff
-    @field @init(100) declare hp: number;
+    @init(100) hp!: number;
```

`@initializeAs` still requires `@field`:

```diff
-    @field @initializeAs('maxHp') declare currentHp: number;
+    @field @initializeAs('maxHp') currentHp!: number;
```

## Summary

| 0.0.x | 1.0.0 |
|---|---|
| `@field declare x: T` | `@field x!: T` |
| `@field @children declare x: Set<Entity>` | `@children accessor x!: Set<Entity>` |
| `@field @parent(C, k) declare x: Entity` | `@parent(C, k) accessor x!: Entity` |
| `@field @validate(fn) declare x: T` | `@validate(fn) accessor x!: T` |
| `@field @init(v) declare x: T` | `@init(v) x!: T` |
| `@field @initializeAs(f) declare x: T` | `@field @initializeAs(f) x!: T` |
