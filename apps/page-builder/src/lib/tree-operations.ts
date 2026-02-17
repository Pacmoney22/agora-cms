import type { ComponentInstance, ComponentTree } from '@agora-cms/shared';

/**
 * Find a node in the component tree by instanceId.
 * Returns the node or null if not found.
 */
export function findNode(
  node: ComponentInstance,
  instanceId: string
): ComponentInstance | null {
  if (node.instanceId === instanceId) return node;

  for (const child of node.children) {
    const found = findNode(child, instanceId);
    if (found) return found;
  }

  return null;
}

/**
 * Find the parent of a node in the component tree by instanceId.
 * Returns the parent node or null if the node is root or not found.
 */
export function findParent(
  node: ComponentInstance,
  instanceId: string
): ComponentInstance | null {
  for (const child of node.children) {
    if (child.instanceId === instanceId) return node;
    const found = findParent(child, instanceId);
    if (found) return found;
  }

  return null;
}

/**
 * Insert a new component as a child of the specified parent.
 * Mutates the tree in place (designed to be called inside Immer's set()).
 */
export function insertNode(
  tree: ComponentTree,
  parentId: string,
  component: ComponentInstance,
  index?: number
): ComponentTree {
  const parent = findNode(tree.root, parentId);

  if (!parent) {
    throw new Error(`Parent node with id "${parentId}" not found`);
  }

  if (index !== undefined && index >= 0 && index <= parent.children.length) {
    parent.children.splice(index, 0, component);
  } else {
    parent.children.push(component);
  }

  return tree;
}

/**
 * Move a component from its current position to a new parent at the specified index.
 * Mutates the tree in place (designed to be called inside Immer's set()).
 */
export function moveNode(
  tree: ComponentTree,
  instanceId: string,
  newParentId: string,
  newIndex: number
): ComponentTree {
  // Find and remove from current parent
  const currentParent = findParent(tree.root, instanceId);
  if (!currentParent) {
    throw new Error(`Node with id "${instanceId}" not found in tree`);
  }

  const currentIndex = currentParent.children.findIndex(
    (child) => child.instanceId === instanceId
  );
  const [movedNode] = currentParent.children.splice(currentIndex, 1) as [ComponentInstance];

  // Insert into new parent
  const newParent = findNode(tree.root, newParentId);
  if (!newParent) {
    throw new Error(`New parent node with id "${newParentId}" not found`);
  }

  // Adjust index if moving within the same parent
  let adjustedIndex = newIndex;
  if (currentParent.instanceId === newParent.instanceId && currentIndex < newIndex) {
    adjustedIndex = newIndex - 1;
  }

  if (adjustedIndex >= 0 && adjustedIndex <= newParent.children.length) {
    newParent.children.splice(adjustedIndex, 0, movedNode);
  } else {
    newParent.children.push(movedNode);
  }

  return tree;
}

/**
 * Remove a component and all its children from the tree.
 * Mutates the tree in place (designed to be called inside Immer's set()).
 */
export function removeNode(
  tree: ComponentTree,
  instanceId: string
): ComponentTree {
  if (tree.root.instanceId === instanceId) {
    throw new Error('Cannot remove the root node');
  }

  const parent = findParent(tree.root, instanceId);

  if (!parent) {
    throw new Error(`Node with id "${instanceId}" not found in tree`);
  }

  parent.children = parent.children.filter(
    (child) => child.instanceId !== instanceId
  );

  return tree;
}

/**
 * Update the props of a specific component.
 * Props are merged (shallow) with existing props.
 * Mutates the tree in place (designed to be called inside Immer's set()).
 */
export function updateNodeProps(
  tree: ComponentTree,
  instanceId: string,
  props: Record<string, unknown>
): ComponentTree {
  const node = findNode(tree.root, instanceId);

  if (!node) {
    throw new Error(`Node with id "${instanceId}" not found`);
  }

  Object.assign(node.props, props);

  return tree;
}

/**
 * Duplicate a component and insert it after the original in the same parent.
 * All instanceIds in the duplicated subtree are regenerated.
 * Mutates the tree in place (designed to be called inside Immer's set()).
 */
export function duplicateNode(
  tree: ComponentTree,
  instanceId: string
): ComponentTree {
  if (tree.root.instanceId === instanceId) {
    throw new Error('Cannot duplicate the root node');
  }

  const parent = findParent(tree.root, instanceId);

  if (!parent) {
    throw new Error(`Node with id "${instanceId}" not found in tree`);
  }

  const originalIndex = parent.children.findIndex(
    (child) => child.instanceId === instanceId
  );
  const original = parent.children[originalIndex]!;

  // Deep clone the subtree for duplication (plain data, no proxies)
  const duplicate = JSON.parse(JSON.stringify(original)) as ComponentInstance;

  // Assign new instanceIds recursively
  assignNewInstanceIds(duplicate);

  // Insert after the original
  parent.children.splice(originalIndex + 1, 0, duplicate);

  return tree;
}

/**
 * Recursively assigns new instanceIds to a component subtree.
 */
function assignNewInstanceIds(node: ComponentInstance): void {
  node.instanceId = crypto.randomUUID();
  for (const child of node.children) {
    assignNewInstanceIds(child);
  }
}
