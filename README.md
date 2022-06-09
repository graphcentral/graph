# react-typescript-monorepo-boilerplate
_Too tired to create all web projects from scratch again and again_

Unless you have a project that is going to be heavily dependent upon some framework (for example, you might be using Next.js), it's always the best practice NOT to use create-react-app to leave 100% of room for custom configurations. This is just the template repository for that.

The configs include the basic things I use for any of my projects. They're opinionated.

# Included in the box
- [x] eslint (+ prettier) autofix as you save on VSCode
- [x] monorepo using npm v8+ workspaces
- [x] webpack and its configs in Typescript
- [x] jest config in Typescript
- [x] jest + enzyme
- [x] react + typescript + basic utils
- [x] storybook
- [x] npm
- [x] nvmrc (currently 16.x)

# Tips
- Don't install any packages inside `packages/*`. Install all modules for `packages/*` from the root: i.e. `npm i --save-dev mymodule -w packages/app`. This way, it won't create `package-lock.json` inside `packages/app`. If you simply run `npm i --save-dev mymodule` inside `packages/app`, `package-lock.json` will be created inside there as well, and this might confuse module resolution later.
- This config is based on the assumption that the developer is using Visual Studio Code.