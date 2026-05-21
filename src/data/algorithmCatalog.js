const COLORS = {
  idle: "#7dd3fc",
  active: "#f97316",
  success: "#34d399",
  warn: "#facc15",
  muted: "#334155",
  violet: "#a78bfa",
};

const defaultGraphNodes = ["A", "B", "C", "D", "E", "F"];

function parseNumberList(input) {
  return input
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));
}

function parseSearchInput(input) {
  const [listPart, targetPart] = input.split("|");
  return {
    values: parseNumberList(listPart ?? ""),
    target: Number((targetPart ?? "").trim()),
  };
}

function createArrayState(values, options = {}) {
  return {
    view: "array",
    values: [...values],
    active: options.active ?? [],
    compared: options.compared ?? [],
    found: options.found ?? [],
    sorted: options.sorted ?? [],
    pivot: options.pivot ?? null,
    eliminated: options.eliminated ?? [],
    notes: options.notes ?? "",
  };
}

function createStructureState(items, layout, options = {}) {
  return {
    view: "structure",
    layout,
    items: JSON.parse(JSON.stringify(items)),
    pointers: options.pointers ?? [],
    notes: options.notes ?? "",
  };
}

function createTreeState(nodes, edges, options = {}) {
  return {
    view: "tree",
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
    notes: options.notes ?? "",
    footer: options.footer ?? "",
    activeNodes: options.activeNodes ?? [],
    pathNodes: options.pathNodes ?? [],
    pendingValue: options.pendingValue ?? null,
  };
}

function createGraphState(nodes, edges, options = {}) {
  return {
    view: "graph",
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
    notes: options.notes ?? "",
    footer: options.footer ?? "",
  };
}

function createGridState(grid, options = {}) {
  return {
    view: "grid",
    grid: JSON.parse(JSON.stringify(grid)),
    highlights: options.highlights ?? [],
    notes: options.notes ?? "",
  };
}

function createTableState(matrix, options = {}) {
  return {
    view: "table",
    matrix: JSON.parse(JSON.stringify(matrix)),
    rowLabels: options.rowLabels ?? [],
    colLabels: options.colLabels ?? [],
    highlights: options.highlights ?? [],
    notes: options.notes ?? "",
  };
}

function createTimelineState(segments, metrics, options = {}) {
  return {
    view: "timeline",
    segments: JSON.parse(JSON.stringify(segments)),
    metrics: JSON.parse(JSON.stringify(metrics)),
    notes: options.notes ?? "",
  };
}

function createDiskState(path, options = {}) {
  return {
    view: "disk",
    path: [...path],
    maxTrack: options.maxTrack ?? 199,
    notes: options.notes ?? "",
    totalSeek: options.totalSeek ?? 0,
  };
}

function createRecursionState(nodes, edges, stack, options = {}) {
  return {
    view: "recursion",
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
    stack: [...stack],
    notes: options.notes ?? "",
  };
}

function createStep(operation, caption, state, extra = {}) {
  return {
    operation,
    caption,
    state,
    prediction: extra.prediction ?? operation,
    codeLine: extra.codeLine ?? "",
  };
}

function measureComplexity(entry, input) {
  const samples = [4, 6, 8, 10, 12];
  return samples.map((size) => {
    const seed = Array.from({ length: size }, (_, index) => size * 2 - index);
    const syntheticInput = entry.makeSyntheticInput
      ? entry.makeSyntheticInput(seed, input)
      : seed.join(",");
    const started = performance.now();
    const result = entry.generate(syntheticInput);
    const elapsed = performance.now() - started;
    return { size, time: Number(elapsed.toFixed(2)), steps: result.steps.length };
  });
}

function buildComparator(entry, input) {
  const started = performance.now();
  const result = entry.generate(input);
  const duration = performance.now() - started;
  return {
    title: entry.title,
    steps: result.steps.length,
    durationMs: Number(duration.toFixed(2)),
    memoryScore: Math.max(1, Math.ceil(JSON.stringify(result.steps[0]?.state ?? {}).length / 240)),
  };
}

function buildBarCatalogEntry(id, title, description, complexity, pseudocode, generate) {
  return {
    id,
    title,
    section: "Sorting Algorithms",
    description,
    defaultInput: "10,4,7,2,9,1,5",
    inputLabel: "Array Input",
    inputHint: "Comma-separated numbers",
    complexity,
    pseudocode,
    generate,
    makeSyntheticInput: (values) => values.join(","),
  };
}

function bubbleSort(input) {
  const arr = parseNumberList(input);
  const steps = [createStep("highlight", "Initial array loaded.", createArrayState(arr))];
  const sorted = new Set();
  for (let end = arr.length - 1; end >= 0; end -= 1) {
    for (let i = 0; i < end; i += 1) {
      steps.push(createStep("compare", `Compare ${arr[i]} and ${arr[i + 1]}.`, createArrayState(arr, { compared: [i, i + 1], sorted: [...sorted] })));
      if (arr[i] > arr[i + 1]) {
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        steps.push(createStep("swap", `Swap the inverted pair at ${i} and ${i + 1}.`, createArrayState(arr, { active: [i, i + 1], sorted: [...sorted] })));
      }
    }
    sorted.add(end);
    steps.push(createStep("mark-sorted", `${arr[end]} is locked in place.`, createArrayState(arr, { sorted: [...sorted] })));
  }
  return { steps, summary: "Bubble Sort repeatedly swaps adjacent inversions until the largest values settle at the end." };
}

function selectionSort(input) {
  const arr = parseNumberList(input);
  const steps = [createStep("highlight", "Initial array loaded.", createArrayState(arr))];
  const sorted = [];
  for (let i = 0; i < arr.length; i += 1) {
    let minIndex = i;
    for (let j = i + 1; j < arr.length; j += 1) {
      steps.push(createStep("compare", `Compare current minimum ${arr[minIndex]} with ${arr[j]}.`, createArrayState(arr, { compared: [minIndex, j], sorted })));
      if (arr[j] < arr[minIndex]) {
        minIndex = j;
        steps.push(createStep("highlight", `${arr[minIndex]} becomes the new minimum candidate.`, createArrayState(arr, { active: [minIndex], sorted })));
      }
    }
    [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
    sorted.push(i);
    steps.push(createStep("swap", `Place ${arr[i]} into sorted position ${i}.`, createArrayState(arr, { active: [i, minIndex], sorted })));
  }
  return { steps, summary: "Selection Sort chooses the smallest remaining element for each position." };
}

function insertionSort(input) {
  const arr = parseNumberList(input);
  const steps = [createStep("highlight", "Initial array loaded.", createArrayState(arr))];
  for (let i = 1; i < arr.length; i += 1) {
    const key = arr[i];
    let j = i - 1;
    steps.push(createStep("select", `Use ${key} as the key.`, createArrayState(arr, { active: [i] })));
    while (j >= 0 && arr[j] > key) {
      steps.push(createStep("compare", `Shift ${arr[j]} right because it is larger than ${key}.`, createArrayState(arr, { compared: [j, j + 1] })));
      arr[j + 1] = arr[j];
      steps.push(createStep("shift", `Move ${arr[j + 1]} to index ${j + 1}.`, createArrayState(arr, { active: [j + 1] })));
      j -= 1;
    }
    arr[j + 1] = key;
    steps.push(createStep("insert", `Insert ${key} at index ${j + 1}.`, createArrayState(arr, { active: [j + 1], sorted: Array.from({ length: i + 1 }, (_, index) => index) })));
  }
  return { steps, summary: "Insertion Sort maintains a sorted prefix and inserts each new key into it." };
}

function mergeSort(input) {
  const arr = parseNumberList(input);
  const steps = [createStep("highlight", "Initial array loaded.", createArrayState(arr))];
  function merge(left, mid, right) {
    const leftPart = arr.slice(left, mid + 1);
    const rightPart = arr.slice(mid + 1, right + 1);
    let i = 0;
    let j = 0;
    let k = left;
    steps.push(createStep("split", `Merge segments [${left}, ${mid}] and [${mid + 1}, ${right}].`, createArrayState(arr, { active: [left, right] })));
    while (i < leftPart.length && j < rightPart.length) {
      steps.push(createStep("compare", `Compare ${leftPart[i]} and ${rightPart[j]}.`, createArrayState(arr, { compared: [left + i, mid + 1 + j] })));
      arr[k] = leftPart[i] <= rightPart[j] ? leftPart[i++] : rightPart[j++];
      steps.push(createStep("overwrite", `Write ${arr[k]} into index ${k}.`, createArrayState(arr, { active: [k] })));
      k += 1;
    }
    while (i < leftPart.length) {
      arr[k] = leftPart[i++];
      steps.push(createStep("overwrite", `Copy leftover ${arr[k]} into index ${k}.`, createArrayState(arr, { active: [k] })));
      k += 1;
    }
    while (j < rightPart.length) {
      arr[k] = rightPart[j++];
      steps.push(createStep("overwrite", `Copy leftover ${arr[k]} into index ${k}.`, createArrayState(arr, { active: [k] })));
      k += 1;
    }
  }
  function divide(left, right) {
    if (left >= right) return;
    const mid = Math.floor((left + right) / 2);
    divide(left, mid);
    divide(mid + 1, right);
    merge(left, mid, right);
  }
  divide(0, arr.length - 1);
  steps.push(createStep("done", "Merge Sort completed.", createArrayState(arr, { sorted: arr.map((_, index) => index) })));
  return { steps, summary: "Merge Sort divides recursively, then merges sorted halves." };
}

function quickSort(input) {
  const arr = parseNumberList(input);
  const steps = [createStep("highlight", "Initial array loaded.", createArrayState(arr))];
  function partition(low, high) {
    const pivot = arr[high];
    let i = low - 1;
    steps.push(createStep("pivot", `Choose ${pivot} as pivot.`, createArrayState(arr, { pivot: high, active: [high] })));
    for (let j = low; j < high; j += 1) {
      steps.push(createStep("compare", `Compare ${arr[j]} with pivot ${pivot}.`, createArrayState(arr, { compared: [j, high], pivot: high })));
      if (arr[j] <= pivot) {
        i += 1;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        steps.push(createStep("swap", `Move ${arr[i]} into the left partition.`, createArrayState(arr, { active: [i, j], pivot: high })));
      }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    steps.push(createStep("swap", `Place pivot ${arr[i + 1]} at index ${i + 1}.`, createArrayState(arr, { active: [i + 1], pivot: i + 1 })));
    return i + 1;
  }
  function sort(low, high) {
    if (low < high) {
      const pivotIndex = partition(low, high);
      sort(low, pivotIndex - 1);
      sort(pivotIndex + 1, high);
    }
  }
  sort(0, arr.length - 1);
  steps.push(createStep("done", "Quick Sort completed.", createArrayState(arr, { sorted: arr.map((_, index) => index) })));
  return { steps, summary: "Quick Sort partitions around a pivot and recurses on each side." };
}

function heapSort(input) {
  const arr = parseNumberList(input);
  const steps = [createStep("highlight", "Initial array loaded.", createArrayState(arr))];
  function heapify(length, index) {
    let largest = index;
    const left = 2 * index + 1;
    const right = 2 * index + 2;
    if (left < length) {
      steps.push(createStep("compare", `Compare parent ${arr[largest]} with left child ${arr[left]}.`, createArrayState(arr, { compared: [largest, left] })));
      if (arr[left] > arr[largest]) largest = left;
    }
    if (right < length) {
      steps.push(createStep("compare", `Compare current largest ${arr[largest]} with right child ${arr[right]}.`, createArrayState(arr, { compared: [largest, right] })));
      if (arr[right] > arr[largest]) largest = right;
    }
    if (largest !== index) {
      [arr[index], arr[largest]] = [arr[largest], arr[index]];
      steps.push(createStep("swap", "Swap to restore the heap property.", createArrayState(arr, { active: [index, largest] })));
      heapify(length, largest);
    }
  }
  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i -= 1) heapify(arr.length, i);
  for (let end = arr.length - 1; end > 0; end -= 1) {
    [arr[0], arr[end]] = [arr[end], arr[0]];
    steps.push(createStep("extract", `Move max element ${arr[end]} to index ${end}.`, createArrayState(arr, { active: [0, end] })));
    heapify(end, 0);
  }
  steps.push(createStep("done", "Heap Sort completed.", createArrayState(arr, { sorted: arr.map((_, index) => index) })));
  return { steps, summary: "Heap Sort builds a max heap and repeatedly extracts the root." };
}

function linearSearch(input) {
  const { values, target } = parseSearchInput(input);
  const steps = [createStep("highlight", `Search for ${target}.`, createArrayState(values))];
  for (let i = 0; i < values.length; i += 1) {
    steps.push(createStep("compare", `Check index ${i}.`, createArrayState(values, { compared: [i] })));
    if (values[i] === target) {
      steps.push(createStep("found", `Found ${target} at index ${i}.`, createArrayState(values, { found: [i] })));
      return { steps, summary: "Linear Search checks each element until the target appears." };
    }
  }
  steps.push(createStep("not-found", `Target ${target} was not found.`, createArrayState(values)));
  return { steps, summary: "Linear Search scans from left to right." };
}

function binarySearch(input) {
  const { values, target } = parseSearchInput(input);
  const arr = [...values].sort((a, b) => a - b);
  const steps = [createStep("highlight", "Input is sorted before search.", createArrayState(arr))];
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    steps.push(createStep("probe", `Inspect midpoint ${mid}.`, createArrayState(arr, { active: [mid], eliminated: [...Array(low).keys(), ...Array.from({ length: arr.length - high - 1 }, (_, i) => high + 1 + i)] })));
    if (arr[mid] === target) {
      steps.push(createStep("found", `Found ${target} at index ${mid}.`, createArrayState(arr, { found: [mid] })));
      return { steps, summary: "Binary Search halves the remaining candidate range each step." };
    }
    if (arr[mid] < target) {
      low = mid + 1;
      steps.push(createStep("discard", `Discard the left half up to ${mid}.`, createArrayState(arr, { eliminated: Array.from({ length: low }, (_, index) => index) })));
    } else {
      high = mid - 1;
      steps.push(createStep("discard", `Discard the right half from ${mid}.`, createArrayState(arr, { eliminated: Array.from({ length: arr.length - high - 1 }, (_, index) => high + 1 + index) })));
    }
  }
  steps.push(createStep("not-found", `Target ${target} was not found.`, createArrayState(arr)));
  return { steps, summary: "Binary Search keeps only the half that can still contain the target." };
}

function jumpSearch(input) {
  const { values, target } = parseSearchInput(input);
  const arr = [...values].sort((a, b) => a - b);
  const block = Math.max(1, Math.floor(Math.sqrt(arr.length)));
  const steps = [createStep("highlight", `Jump size = ${block}.`, createArrayState(arr))];
  let prev = 0;
  let current = block;
  while (prev < arr.length && arr[Math.min(current, arr.length) - 1] < target) {
    steps.push(createStep("jump", `Jump to block ending at ${Math.min(current, arr.length) - 1}.`, createArrayState(arr, { active: [prev, Math.min(current, arr.length) - 1] })));
    prev = current;
    current += block;
  }
  for (let i = prev; i < Math.min(current, arr.length); i += 1) {
    steps.push(createStep("compare", `Linear probe inside block at index ${i}.`, createArrayState(arr, { compared: [i] })));
    if (arr[i] === target) {
      steps.push(createStep("found", `Found ${target} at index ${i}.`, createArrayState(arr, { found: [i] })));
      return { steps, summary: "Jump Search narrows to one block, then scans inside it." };
    }
  }
  steps.push(createStep("not-found", `Target ${target} was not found.`, createArrayState(arr)));
  return { steps, summary: "Jump Search combines block jumping with a short linear scan." };
}

function interpolationSearch(input) {
  const { values, target } = parseSearchInput(input);
  const arr = [...values].sort((a, b) => a - b);
  const steps = [createStep("highlight", "Estimate the likely target position.", createArrayState(arr))];
  let low = 0;
  let high = arr.length - 1;
  while (low <= high && target >= arr[low] && target <= arr[high]) {
    const pos = low === high
      ? low
      : low + Math.floor(((target - arr[low]) * (high - low)) / Math.max(1, arr[high] - arr[low]));
    steps.push(createStep("probe", `Interpolation suggests index ${pos}.`, createArrayState(arr, { active: [pos] })));
    if (arr[pos] === target) {
      steps.push(createStep("found", `Found ${target} at index ${pos}.`, createArrayState(arr, { found: [pos] })));
      return { steps, summary: "Interpolation Search estimates the next probe from key distribution." };
    }
    if (arr[pos] < target) low = pos + 1;
    else high = pos - 1;
  }
  steps.push(createStep("not-found", `Target ${target} was not found.`, createArrayState(arr)));
  return { steps, summary: "Interpolation Search is strongest when values are uniformly distributed." };
}

function stackOperations(input) {
  const operations = input.split(",").map((token) => token.trim()).filter(Boolean);
  const stack = [];
  const steps = [createStep("highlight", "Stack starts empty.", createStructureState([], "stack"))];
  operations.forEach((operation) => {
    const [command, rawValue] = operation.split(/\s+/);
    if (command?.toLowerCase() === "push") {
      stack.push(rawValue);
      steps.push(createStep("push", `Push ${rawValue}.`, createStructureState(stack.map((value, index) => ({ id: `${value}-${index}`, value, state: index === stack.length - 1 ? "active" : "idle" })), "stack", { pointers: ["top"] })));
    } else if (command?.toLowerCase() === "pop") {
      const removed = stack.pop();
      steps.push(createStep("pop", `Pop ${removed ?? "nothing"}.`, createStructureState(stack.map((value, index) => ({ id: `${value}-${index}`, value, state: "idle" })), "stack", { pointers: stack.length ? ["top"] : [] })));
    }
  });
  return { steps, summary: "Stacks follow last-in, first-out behavior." };
}

function circularQueueOperations(input) {
  const operations = input.split(",").map((token) => token.trim()).filter(Boolean);
  const queue = [];
  const capacity = 5;
  const steps = [createStep("highlight", `Queue capacity is ${capacity}.`, createStructureState([], "queue"))];
  operations.forEach((operation) => {
    const [command, rawValue] = operation.split(/\s+/);
    if (command?.toLowerCase() === "enqueue" && queue.length < capacity) {
      queue.push(rawValue);
      steps.push(createStep("enqueue", `Enqueue ${rawValue}.`, createStructureState(queue.map((value, index) => ({ id: `${value}-${index}`, value, state: index === queue.length - 1 ? "active" : "idle" })), "queue", { pointers: ["front", "rear"] })));
    } else if (command?.toLowerCase() === "dequeue") {
      const removed = queue.shift();
      steps.push(createStep("dequeue", `Dequeue ${removed ?? "nothing"}.`, createStructureState(queue.map((value, index) => ({ id: `${value}-${index}`, value, state: index === 0 ? "active" : "idle" })), "queue", { pointers: queue.length ? ["front", "rear"] : [] })));
    }
  });
  return { steps, summary: "Circular queues maintain constant-time enqueue and dequeue with wraparound indexing." };
}

function linkedListOperations(input) {
  const operations = input.split(",").map((token) => token.trim()).filter(Boolean);
  const list = [];
  const steps = [createStep("highlight", "Linked list starts empty.", createStructureState([], "list"))];
  operations.forEach((operation) => {
    const [command, rawValue] = operation.split(/\s+/);
    if (command?.toLowerCase() === "insert") {
      list.push(rawValue);
      steps.push(createStep("insert", `Insert node ${rawValue}.`, createStructureState(list.map((value, index) => ({ id: `${value}-${index}`, value, state: index === list.length - 1 ? "active" : "idle" })), "list", { pointers: ["head", "tail"] })));
    } else if (command?.toLowerCase() === "delete") {
      const index = list.indexOf(rawValue);
      if (index !== -1) list.splice(index, 1);
      steps.push(createStep("delete", `Delete node ${rawValue}.`, createStructureState(list.map((value, idx) => ({ id: `${value}-${idx}`, value, state: "idle" })), "list", { pointers: list.length ? ["head", "tail"] : [] })));
    }
  });
  return { steps, summary: "Linked lists update pointers instead of shifting contiguous memory." };
}

function createTreeNode(value) {
  return { value, left: null, right: null };
}

function cloneTree(root) {
  if (!root) return null;
  return {
    value: root.value,
    color: root.color,
    left: cloneTree(root.left),
    right: cloneTree(root.right),
  };
}

function buildTreeLayout(root, options = {}) {
  const nodes = [];
  const edges = [];
  const activeSet = new Set(options.activeNodes ?? []);
  const pathSet = new Set(options.pathNodes ?? []);

  function walk(node, depth, left, right, parent = null) {
    if (!node) return;
    const x = (left + right) / 2;
    const y = 80 + depth * 92;
    nodes.push({
      id: String(node.value),
      label: String(node.value),
      value: node.value,
      x,
      y,
      color: node.color === "RED"
        ? "#ef4444"
        : node.color === "BLACK"
          ? "#111827"
          : activeSet.has(node.value)
            ? COLORS.active
            : pathSet.has(node.value)
              ? COLORS.warn
              : COLORS.idle,
      textColor: node.color === "BLACK" || node.color === "RED" ? "#f8fafc" : "#08111f",
    });
    if (parent) {
      edges.push({
        from: String(parent.value),
        to: String(node.value),
        color: pathSet.has(parent.value) && pathSet.has(node.value) ? COLORS.warn : COLORS.muted,
      });
    }
    walk(node.left, depth + 1, left, x, node);
    walk(node.right, depth + 1, x, right, node);
  }

  walk(root, 0, 40, 520);
  return createTreeState(nodes, edges, options);
}

function bstInsertion(input) {
  const values = parseNumberList(input);
  const steps = [];
  let root = null;

  values.forEach((value) => {
    if (!root) {
      root = createTreeNode(value);
      steps.push(
        createStep(
          "insert-root",
          `Tree is empty, so ${value} becomes the root.`,
          buildTreeLayout(cloneTree(root), {
            activeNodes: [value],
            pathNodes: [value],
            pendingValue: value,
            notes: `Inserted ${value} as the root node.`,
            footer: "BST rule: smaller values go left, larger values go right.",
          }),
        ),
      );
      return;
    }

    const path = [];
    let current = root;
    while (current) {
      path.push(current.value);
      steps.push(
        createStep(
          "compare-node",
          `Compare ${value} with current node ${current.value}.`,
          buildTreeLayout(cloneTree(root), {
            activeNodes: [current.value],
            pathNodes: path,
            pendingValue: value,
            notes: value < current.value ? `${value} is smaller, so move left.` : `${value} is larger, so move right.`,
            footer: `Traversal path: ${path.join(" -> ")}`,
          }),
        ),
      );

      if (value < current.value) {
        if (!current.left) {
          current.left = createTreeNode(value);
          path.push(value);
          steps.push(
            createStep(
              "insert-left",
              `Insert ${value} as the left child of ${current.value}.`,
              buildTreeLayout(cloneTree(root), {
                activeNodes: [value],
                pathNodes: path,
                pendingValue: value,
                notes: `Left slot of ${current.value} was empty, so ${value} is placed there.`,
                footer: `Traversal path: ${path.join(" -> ")}`,
              }),
            ),
          );
          break;
        }
        current = current.left;
      } else if (value > current.value) {
        if (!current.right) {
          current.right = createTreeNode(value);
          path.push(value);
          steps.push(
            createStep(
              "insert-right",
              `Insert ${value} as the right child of ${current.value}.`,
              buildTreeLayout(cloneTree(root), {
                activeNodes: [value],
                pathNodes: path,
                pendingValue: value,
                notes: `Right slot of ${current.value} was empty, so ${value} is placed there.`,
                footer: `Traversal path: ${path.join(" -> ")}`,
              }),
            ),
          );
          break;
        }
        current = current.right;
      } else {
        steps.push(
          createStep(
            "duplicate",
            `${value} is already present, so the BST skips duplicate insertion.`,
            buildTreeLayout(cloneTree(root), {
              activeNodes: [current.value],
              pathNodes: path,
              pendingValue: value,
              notes: "Duplicate keys are ignored in this visualizer.",
              footer: `Traversal path: ${path.join(" -> ")}`,
            }),
          ),
        );
        break;
      }
    }
  });

  return { steps, summary: "BST insertion now traces every comparison and movement before placing the new node." };
}

function getHeight(node) {
  if (!node) return 0;
  return 1 + Math.max(getHeight(node.left), getHeight(node.right));
}

function avlInsertion(input) {
  const values = parseNumberList(input);
  const steps = [];
  let root = null;

  values.forEach((value) => {
    if (!root) {
      root = createTreeNode(value);
      steps.push(
        createStep(
          "insert-root",
          `AVL tree starts with root ${value}.`,
          buildTreeLayout(cloneTree(root), {
            activeNodes: [value],
            pathNodes: [value],
            pendingValue: value,
            notes: "The first node is automatically balanced.",
            footer: "Balance factor = height(left) - height(right)",
          }),
        ),
      );
      return;
    }

    const path = [];
    let current = root;
    while (current) {
      path.push(current.value);
      steps.push(
        createStep(
          "compare-node",
          `Compare ${value} with ${current.value} while searching insertion point.`,
          buildTreeLayout(cloneTree(root), {
            activeNodes: [current.value],
            pathNodes: path,
            pendingValue: value,
            notes: value < current.value ? `${value} moves into the left subtree.` : `${value} moves into the right subtree.`,
            footer: `Traversal path: ${path.join(" -> ")}`,
          }),
        ),
      );
      if (value < current.value) {
        if (!current.left) {
          current.left = createTreeNode(value);
          path.push(value);
          break;
        }
        current = current.left;
      } else if (value > current.value) {
        if (!current.right) {
          current.right = createTreeNode(value);
          path.push(value);
          break;
        }
        current = current.right;
      } else {
        break;
      }
    }

    const treeSnapshot = cloneTree(root);
    const balanceDetails = path
      .slice(0, -1)
      .reverse()
      .map((nodeValue) => {
        function find(node) {
          if (!node) return null;
          if (node.value === nodeValue) return node;
          return find(node.left) ?? find(node.right);
        }
        const node = find(treeSnapshot);
        return `${nodeValue}: bf=${getHeight(node?.left) - getHeight(node?.right)}`;
      });

    steps.push(
      createStep(
        "insert-node",
        `Insert ${value} and inspect balance factors on the way back up.`,
        buildTreeLayout(treeSnapshot, {
          activeNodes: [value],
          pathNodes: path,
          pendingValue: value,
          notes: "AVL insertions follow BST placement, then check whether any ancestor becomes unbalanced.",
          footer: balanceDetails.length ? `Balance factors after insertion: ${balanceDetails.join(" | ")}` : "Balance factor check complete.",
        }),
      ),
    );
  });

  return { steps, summary: "AVL insertion now shows the actual search path and the balance-factor check after placement." };
}

function createRedBlackNode(value) {
  return { value, color: "RED", left: null, right: null, parent: null };
}

function redBlackColor(node) {
  return node?.color ?? "BLACK";
}

function rotateRedBlackLeft(root, node) {
  const pivot = node.right;
  node.right = pivot.left;
  if (pivot.left) pivot.left.parent = node;
  pivot.parent = node.parent;
  if (!node.parent) root = pivot;
  else if (node === node.parent.left) node.parent.left = pivot;
  else node.parent.right = pivot;
  pivot.left = node;
  node.parent = pivot;
  return root;
}

function rotateRedBlackRight(root, node) {
  const pivot = node.left;
  node.left = pivot.right;
  if (pivot.right) pivot.right.parent = node;
  pivot.parent = node.parent;
  if (!node.parent) root = pivot;
  else if (node === node.parent.right) node.parent.right = pivot;
  else node.parent.left = pivot;
  pivot.right = node;
  node.parent = pivot;
  return root;
}

function redBlackInsertion(input) {
  const values = parseNumberList(input);
  const steps = [];
  let root = null;

  function snapshot(operation, caption, activeNodes = [], pathNodes = [], notes = "", pendingValue = null) {
    steps.push(
      createStep(
        operation,
        caption,
        buildTreeLayout(cloneTree(root), {
          activeNodes,
          pathNodes,
          pendingValue,
          notes,
          footer: "Red-Black rules: root is black, red nodes cannot have red children, every root-to-leaf path has equal black height.",
        }),
      ),
    );
  }

  values.forEach((value) => {
    const node = createRedBlackNode(value);
    let parent = null;
    let current = root;
    const path = [];

    while (current) {
      parent = current;
      path.push(current.value);
      snapshot(
        "compare-node",
        `Compare ${value} with ${current.value}.`,
        [current.value],
        path,
        value < current.value ? `${value} moves left.` : `${value} moves right.`,
        value,
      );
      if (value < current.value) current = current.left;
      else if (value > current.value) current = current.right;
      else {
        snapshot("duplicate", `${value} already exists, so Red-Black insertion skips it.`, [current.value], path, "Duplicate keys are ignored.", value);
        return;
      }
    }

    node.parent = parent;
    if (!parent) root = node;
    else if (value < parent.value) parent.left = node;
    else parent.right = node;

    snapshot(
      "insert-red",
      `Insert ${value} as a red node.`,
      [value],
      [...path, value],
      parent ? `New leaves start red under parent ${parent.value}.` : "The first node starts red, then root correction makes it black.",
      value,
    );

    let cursor = node;
    while (cursor !== root && redBlackColor(cursor.parent) === "RED") {
      const parentNode = cursor.parent;
      const grandparent = parentNode.parent;
      if (!grandparent) break;

      if (parentNode === grandparent.left) {
        const uncle = grandparent.right;
        if (redBlackColor(uncle) === "RED") {
          parentNode.color = "BLACK";
          uncle.color = "BLACK";
          grandparent.color = "RED";
          snapshot(
            "recolor",
            `Recolor parent ${parentNode.value}, uncle ${uncle.value}, and grandparent ${grandparent.value}.`,
            [parentNode.value, uncle.value, grandparent.value],
            [grandparent.value, parentNode.value, cursor.value],
            "Case 1: red parent and red uncle. Push the red conflict upward.",
            value,
          );
          cursor = grandparent;
        } else {
          if (cursor === parentNode.right) {
            cursor = parentNode;
            root = rotateRedBlackLeft(root, cursor);
            snapshot(
              "rotate-left",
              `Left rotation at ${cursor.value} converts the triangle into a line.`,
              [cursor.value, cursor.parent.value],
              [grandparent.value, cursor.parent.value],
              "Case 2: left-right triangle. Rotate toward the inserted node first.",
              value,
            );
          }
          cursor.parent.color = "BLACK";
          cursor.parent.parent.color = "RED";
          const rotateAt = cursor.parent.parent;
          root = rotateRedBlackRight(root, rotateAt);
          snapshot(
            "rotate-right",
            `Right rotation at ${rotateAt.value} repairs the red-red violation.`,
            [cursor.parent.value, rotateAt.value],
            [cursor.parent.value, rotateAt.value],
            "Case 3: left-left line. Rotate the grandparent and swap colors.",
            value,
          );
        }
      } else {
        const uncle = grandparent.left;
        if (redBlackColor(uncle) === "RED") {
          parentNode.color = "BLACK";
          uncle.color = "BLACK";
          grandparent.color = "RED";
          snapshot(
            "recolor",
            `Recolor parent ${parentNode.value}, uncle ${uncle.value}, and grandparent ${grandparent.value}.`,
            [parentNode.value, uncle.value, grandparent.value],
            [grandparent.value, parentNode.value, cursor.value],
            "Mirror Case 1: red parent and red uncle. Push the red conflict upward.",
            value,
          );
          cursor = grandparent;
        } else {
          if (cursor === parentNode.left) {
            cursor = parentNode;
            root = rotateRedBlackRight(root, cursor);
            snapshot(
              "rotate-right",
              `Right rotation at ${cursor.value} converts the triangle into a line.`,
              [cursor.value, cursor.parent.value],
              [grandparent.value, cursor.parent.value],
              "Mirror Case 2: right-left triangle. Rotate toward the inserted node first.",
              value,
            );
          }
          cursor.parent.color = "BLACK";
          cursor.parent.parent.color = "RED";
          const rotateAt = cursor.parent.parent;
          root = rotateRedBlackLeft(root, rotateAt);
          snapshot(
            "rotate-left",
            `Left rotation at ${rotateAt.value} repairs the red-red violation.`,
            [cursor.parent.value, rotateAt.value],
            [cursor.parent.value, rotateAt.value],
            "Mirror Case 3: right-right line. Rotate the grandparent and swap colors.",
            value,
          );
        }
      }
    }

    if (root && root.color !== "BLACK") {
      root.color = "BLACK";
      snapshot("root-black", `Force root ${root.value} to black.`, [root.value], [root.value], "The root of a Red-Black tree is always black.", value);
    }
  });

  return {
    steps,
    summary: "Red-Black insertion keeps the tree approximately balanced using red inserts, recoloring, and rotations.",
  };
}

function minHeapOperations(input) {
  const operations = input.split(",").map((token) => token.trim()).filter(Boolean);
  const heap = [];
  const steps = [];
  function snapshot(activeIndex = null, note = "") {
    const nodes = heap.map((value, index) => ({
      id: `${value}-${index}`,
      label: String(value),
      value,
      x: 80 + (index % 4) * 120,
      y: 80 + Math.floor(index / 4) * 100,
      color: activeIndex === index ? COLORS.active : COLORS.idle,
    }));
    const edges = heap.flatMap((_value, index) => [2 * index + 1, 2 * index + 2]
      .filter((child) => child < heap.length)
      .map((child) => ({ from: `${heap[index]}-${index}`, to: `${heap[child]}-${child}`, color: COLORS.muted })));
    return createTreeState(nodes, edges, { notes: note, footer: `Array form: [${heap.join(", ")}]` });
  }
  function bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      steps.push(createStep("compare", `Compare child ${heap[index]} with parent ${heap[parent]}.`, snapshot(index)));
      if (heap[parent] <= heap[index]) break;
      [heap[parent], heap[index]] = [heap[index], heap[parent]];
      steps.push(createStep("swap", "Swap to restore min-heap order.", snapshot(parent)));
      index = parent;
    }
  }
  operations.forEach((operation) => {
    const [command, rawValue] = operation.split(/\s+/);
    if (command?.toLowerCase() === "insert") {
      heap.push(Number(rawValue));
      steps.push(createStep("insert", `Insert ${rawValue} at the end.`, snapshot(heap.length - 1)));
      bubbleUp(heap.length - 1);
    }
  });
  return { steps, summary: "A min heap keeps the smallest value at the root." };
}

function parseGraphInput(input) {
  const [edgesPart, sourcePart] = input.split("|");
  const edges = (edgesPart ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const [pair, weightRaw] = token.split(":");
      const [from, to] = pair.split("-").map((value) => value.trim());
      return { from, to, weight: Number(weightRaw ?? 1) };
    });
  const nodeIds = Array.from(new Set(edges.flatMap((edge) => [edge.from, edge.to])));
  const nodes = (nodeIds.length ? nodeIds : defaultGraphNodes).map((id, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(nodeIds.length || 1, 1);
    return {
      id,
      label: id,
      x: 280 + Math.cos(angle) * 180,
      y: 180 + Math.sin(angle) * 130,
      color: COLORS.idle,
    };
  });
  return { nodes, edges, source: (sourcePart ?? nodeIds[0] ?? "A").trim() };
}

function graphStateFromData(nodes, edges, activeNodes = [], activeEdges = [], note = "", footer = "") {
  return createGraphState(
    nodes.map((node) => ({
      ...node,
      color: activeNodes.includes(node.id) ? COLORS.active : node.color ?? COLORS.idle,
    })),
    edges.map((edge, index) => ({
      ...edge,
      id: `${edge.from}-${edge.to}-${index}`,
      color:
        activeEdges.includes(`${edge.from}-${edge.to}`) || activeEdges.includes(`${edge.to}-${edge.from}`)
          ? COLORS.success
          : COLORS.muted,
    })),
    { notes: note, footer },
  );
}

function bfsTraversal(input) {
  const { nodes, edges, source } = parseGraphInput(input);
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  edges.forEach((edge) => {
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  });
  const visited = new Set([source]);
  const queue = [source];
  const steps = [createStep("enqueue", `Start BFS from ${source}.`, graphStateFromData(nodes, edges, [source], [], `Queue: ${queue.join(" -> ")}`))];
  while (queue.length) {
    const current = queue.shift();
    steps.push(createStep("visit", `Visit ${current}.`, graphStateFromData(nodes, edges, [current], [], `Visited: ${[...visited].join(", ")}`)));
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
        steps.push(createStep("enqueue", `Discover ${neighbor} from ${current}.`, graphStateFromData(nodes, edges, [current, neighbor], [`${current}-${neighbor}`], `Queue: ${queue.join(" -> ")}`)));
      }
    }
  }
  return { steps, summary: "BFS explores the graph level by level using a queue." };
}

function dijkstra(input) {
  const { nodes, edges, source } = parseGraphInput(input);
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  edges.forEach((edge) => {
    adjacency.get(edge.from)?.push({ node: edge.to, weight: edge.weight });
    adjacency.get(edge.to)?.push({ node: edge.from, weight: edge.weight });
  });
  const distances = Object.fromEntries(nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]));
  const visited = new Set();
  distances[source] = 0;
  const steps = [createStep("start", `Initialize Dijkstra from ${source}.`, graphStateFromData(nodes, edges, [source], [], `Distances: ${JSON.stringify(distances)}`))];
  while (visited.size < nodes.length) {
    const current = nodes
      .map((node) => node.id)
      .filter((id) => !visited.has(id))
      .sort((a, b) => distances[a] - distances[b])[0];
    if (!current || distances[current] === Number.POSITIVE_INFINITY) break;
    visited.add(current);
    steps.push(createStep("settle", `Settle ${current} with distance ${distances[current]}.`, graphStateFromData(nodes, edges, [current], [], `Distances: ${JSON.stringify(distances)}`)));
    for (const neighbor of adjacency.get(current) ?? []) {
      const nextDistance = distances[current] + neighbor.weight;
      steps.push(createStep("relax", `Relax edge ${current} -> ${neighbor.node}.`, graphStateFromData(nodes, edges, [current, neighbor.node], [`${current}-${neighbor.node}`], `Distances: ${JSON.stringify(distances)}`)));
      if (nextDistance < distances[neighbor.node]) {
        distances[neighbor.node] = nextDistance;
        steps.push(createStep("update", `Update ${neighbor.node} to ${nextDistance}.`, graphStateFromData(nodes, edges, [neighbor.node], [`${current}-${neighbor.node}`], `Distances: ${JSON.stringify(distances)}`)));
      }
    }
  }
  return { steps, summary: "Dijkstra settles the nearest node and relaxes its outgoing edges." };
}

function topologicalSort(input) {
  const { nodes, edges } = parseGraphInput(input);
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  const indegree = Object.fromEntries(nodes.map((node) => [node.id, 0]));
  edges.forEach((edge) => {
    adjacency.get(edge.from)?.push(edge.to);
    indegree[edge.to] += 1;
  });
  const queue = nodes.filter((node) => indegree[node.id] === 0).map((node) => node.id);
  const order = [];
  const steps = [createStep("seed", `Queue all indegree-zero nodes: ${queue.join(", ")}.`, graphStateFromData(nodes, edges, queue, [], `Indegree: ${JSON.stringify(indegree)}`))];
  while (queue.length) {
    const current = queue.shift();
    order.push(current);
    steps.push(createStep("output", `Output ${current}.`, graphStateFromData(nodes, edges, [current], [], `Order: ${order.join(" -> ")}`)));
    for (const neighbor of adjacency.get(current) ?? []) {
      indegree[neighbor] -= 1;
      if (indegree[neighbor] === 0) queue.push(neighbor);
      steps.push(createStep("reduce", `Reduce indegree of ${neighbor}.`, graphStateFromData(nodes, edges, [neighbor], [`${current}-${neighbor}`], `Indegree: ${JSON.stringify(indegree)}`)));
    }
  }
  return { steps, summary: "Topological Sort repeatedly removes nodes with indegree zero." };
}

function activitySelection(input) {
  const activities = input
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token, index) => {
      const [start, finish] = token.split("-").map(Number);
      return { id: `A${index + 1}`, start, finish };
    })
    .sort((a, b) => a.finish - b.finish);
  const selected = [];
  const segments = [];
  const steps = [];
  activities.forEach((activity) => {
    const canSelect = selected.length === 0 || activity.start >= selected[selected.length - 1].finish;
    if (canSelect) selected.push(activity);
    segments.push({ label: activity.id, start: activity.start, end: activity.finish, color: canSelect ? COLORS.success : COLORS.muted });
    steps.push(createStep(canSelect ? "select" : "reject", `${canSelect ? "Select" : "Skip"} ${activity.id} (${activity.start}-${activity.finish}).`, createTimelineState(segments, { selected: selected.map((item) => item.id).join(", ") }, { notes: "Pick the earliest finishing compatible activity." })));
  });
  return { steps, summary: "Activity Selection greedily keeps the earliest finishing compatible intervals." };
}

function fractionalKnapsack(input) {
  const [weightsPart, valuesPart, capacityPart] = input.split(";");
  const weights = parseNumberList((weightsPart ?? "").replace("weights=", ""));
  const values = parseNumberList((valuesPart ?? "").replace("values=", ""));
  const capacity = Number((capacityPart ?? "").replace("capacity=", ""));
  const items = weights
    .map((weight, index) => ({
      id: `I${index + 1}`,
      weight,
      value: values[index],
      ratio: Number((values[index] / weight).toFixed(2)),
    }))
    .sort((a, b) => b.ratio - a.ratio);
  const taken = [];
  const steps = [];
  let remaining = capacity;
  let profit = 0;
  items.forEach((item) => {
    if (remaining <= 0) return;
    const fraction = Math.min(1, remaining / item.weight);
    remaining -= item.weight * fraction;
    profit += item.value * fraction;
    taken.push({ label: `${item.id} (${Math.round(fraction * 100)}%)`, start: 0, end: item.weight * fraction, color: fraction === 1 ? COLORS.success : COLORS.warn });
    steps.push(createStep("take", `Take ${Math.round(fraction * 100)}% of ${item.id}.`, createTimelineState(taken, { profit: Number(profit.toFixed(2)), remaining: Number(remaining.toFixed(2)) }, { notes: `Value density = ${item.ratio}` })));
  });
  return { steps, summary: "Fractional Knapsack takes the highest value density items first." };
}

function huffmanCoding(input) {
  const text = input.trim() || "algorithm";
  const frequencies = [...text].reduce((map, char) => {
    map[char] = (map[char] ?? 0) + 1;
    return map;
  }, {});
  let queue = Object.entries(frequencies)
    .map(([char, freq], index) => ({ id: `${char}-${index}`, char, freq }))
    .sort((a, b) => a.freq - b.freq);
  const steps = [];
  function queueState(note) {
    return createStructureState(queue.map((item) => ({ id: item.id, value: `${item.char ?? "*"}:${item.freq}`, state: "idle" })), "queue", { notes: note, pointers: ["min-heap front"] });
  }
  steps.push(createStep("count", "Count symbol frequencies.", queueState("Lowest frequencies rise to the front.")));
  while (queue.length > 1) {
    const left = queue.shift();
    const right = queue.shift();
    steps.push(createStep("merge", `Merge ${left.char ?? "*"}:${left.freq} and ${right.char ?? "*"}:${right.freq}.`, queueState("Remove the two lightest nodes.")));
    queue.push({ id: `${left.id}-${right.id}`, char: null, freq: left.freq + right.freq, left, right });
    queue = queue.sort((a, b) => a.freq - b.freq);
    steps.push(createStep("reinsert", "Reinsert the merged node into the queue.", queueState("Queue stays sorted by frequency.")));
  }
  return { steps, summary: "Huffman Coding repeatedly merges the two least frequent nodes to build a prefix tree." };
}

function zeroOneKnapsack(input) {
  const [weightsPart, valuesPart, capacityPart] = input.split(";");
  const weights = parseNumberList((weightsPart ?? "").replace("weights=", ""));
  const values = parseNumberList((valuesPart ?? "").replace("values=", ""));
  const capacity = Number((capacityPart ?? "").replace("capacity=", ""));
  const rows = weights.length + 1;
  const cols = capacity + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));
  const rowLabels = ["0", ...weights.map((_, index) => `I${index + 1}`)];
  const colLabels = Array.from({ length: cols }, (_, index) => String(index));
  const steps = [createStep("seed", "Initialize the DP table.", createTableState(dp, { rowLabels, colLabels }))];
  for (let i = 1; i < rows; i += 1) {
    for (let w = 0; w < cols; w += 1) {
      dp[i][w] = weights[i - 1] <= w ? Math.max(values[i - 1] + dp[i - 1][w - weights[i - 1]], dp[i - 1][w]) : dp[i - 1][w];
      steps.push(createStep("fill", `Solve subproblem with first ${i} items and capacity ${w}.`, createTableState(dp, { rowLabels, colLabels, highlights: [[i, w]] })));
    }
  }
  return { steps, summary: "0/1 Knapsack compares including or excluding each item at every capacity." };
}

function lcs(input) {
  const [first, second] = input.split("|");
  const a = (first ?? "").trim();
  const b = (second ?? "").trim();
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  const rowLabels = ["", ...a.split("")];
  const colLabels = ["", ...b.split("")];
  const steps = [createStep("seed", "Create the LCS table.", createTableState(dp, { rowLabels, colLabels }))];
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
      steps.push(createStep("fill", `Compare ${a[i - 1]} and ${b[j - 1]}.`, createTableState(dp, { rowLabels, colLabels, highlights: [[i, j]] })));
    }
  }
  return { steps, summary: "LCS uses dynamic programming to reuse optimal answers for smaller prefixes." };
}

function fibonacciDp(input) {
  const n = Number(input.trim()) || 8;
  const sequence = [0, 1];
  const steps = [createStep("seed", "Start with F(0)=0 and F(1)=1.", createArrayState(sequence, { sorted: [0, 1] }))];
  for (let i = 2; i <= n; i += 1) {
    sequence[i] = sequence[i - 1] + sequence[i - 2];
    steps.push(createStep("compute", `Compute F(${i}) = ${sequence[i]}.`, createArrayState(sequence, { active: [i, i - 1, i - 2] })));
  }
  return { steps, summary: "The DP Fibonacci version stores previous results instead of recomputing subproblems." };
}

function nQueens(input) {
  const size = Number(input.trim()) || 4;
  const board = Array.from({ length: size }, () => Array(size).fill(""));
  const steps = [createStep("seed", `Solve ${size}-Queens row by row.`, createGridState(board, { notes: "Queens cannot share rows, columns, or diagonals." }))];
  const cols = new Set();
  const diag1 = new Set();
  const diag2 = new Set();
  function backtrack(row) {
    if (row === size) return true;
    for (let col = 0; col < size; col += 1) {
      steps.push(createStep("try", `Try row ${row}, col ${col}.`, createGridState(board, { highlights: [[row, col]] })));
      if (cols.has(col) || diag1.has(row - col) || diag2.has(row + col)) {
        steps.push(createStep("reject", `Conflict at (${row}, ${col}).`, createGridState(board, { highlights: [[row, col]], notes: "A queen already attacks this square." })));
        continue;
      }
      board[row][col] = "Q";
      cols.add(col);
      diag1.add(row - col);
      diag2.add(row + col);
      steps.push(createStep("place", `Place queen at (${row}, ${col}).`, createGridState(board, { highlights: [[row, col]] })));
      if (backtrack(row + 1)) return true;
      board[row][col] = "";
      cols.delete(col);
      diag1.delete(row - col);
      diag2.delete(row + col);
      steps.push(createStep("backtrack", `Remove queen from (${row}, ${col}).`, createGridState(board, { highlights: [[row, col]] })));
    }
    return false;
  }
  backtrack(0);
  return { steps, summary: "N-Queens explores safe columns recursively and backtracks when conflicts appear." };
}

function sudokuSolver(input) {
  const normalized = input.replace(/[^0-9.]/g, "");
  const board = Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => normalized[row * 9 + col] || "0"),
  );
  const steps = [createStep("seed", "Start the Sudoku backtracking search.", createGridState(board))];
  function isSafe(row, col, value) {
    for (let index = 0; index < 9; index += 1) {
      if (board[row][index] === value || board[index][col] === value) return false;
    }
    const startRow = row - (row % 3);
    const startCol = col - (col % 3);
    for (let r = startRow; r < startRow + 3; r += 1) {
      for (let c = startCol; c < startCol + 3; c += 1) {
        if (board[r][c] === value) return false;
      }
    }
    return true;
  }
  function solve() {
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (board[row][col] === "0" || board[row][col] === ".") {
          for (let value = 1; value <= 9; value += 1) {
            steps.push(createStep("try", `Try ${value} at (${row}, ${col}).`, createGridState(board, { highlights: [[row, col]] })));
            if (isSafe(row, col, String(value))) {
              board[row][col] = String(value);
              steps.push(createStep("place", `Place ${value} at (${row}, ${col}).`, createGridState(board, { highlights: [[row, col]] })));
              if (solve()) return true;
              board[row][col] = "0";
              steps.push(createStep("backtrack", `Undo ${value} at (${row}, ${col}).`, createGridState(board, { highlights: [[row, col]] })));
            }
          }
          return false;
        }
      }
    }
    return true;
  }
  solve();
  return { steps, summary: "Sudoku solving tests legal digits and unwinds as soon as a contradiction appears." };
}

function ratInMaze(input) {
  const rows = input.split("/").map((row) => row.split("").map((cell) => (cell === "1" ? "■" : "")));
  const steps = [createStep("seed", "Start at the top-left cell and search for an exit path.", createGridState(rows))];
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  function dfs(row, col) {
    if (row < 0 || col < 0 || row >= rows.length || col >= rows[0].length || rows[row][col] === "■" || rows[row][col] === "•") return false;
    rows[row][col] = "•";
    steps.push(createStep("move", `Move to (${row}, ${col}).`, createGridState(rows, { highlights: [[row, col]] })));
    if (row === rows.length - 1 && col === rows[0].length - 1) {
      rows[row][col] = "✓";
      steps.push(createStep("goal", "Reached the destination.", createGridState(rows, { highlights: [[row, col]] })));
      return true;
    }
    for (const [dr, dc] of directions) {
      if (dfs(row + dr, col + dc)) {
        rows[row][col] = "✓";
        return true;
      }
    }
    rows[row][col] = "";
    steps.push(createStep("backtrack", `Backtrack from (${row}, ${col}).`, createGridState(rows, { highlights: [[row, col]] })));
    return false;
  }
  dfs(0, 0);
  return { steps, summary: "Rat in a Maze explores possible moves and reverses when a path gets blocked." };
}

function parseSchedulingInput(input) {
  const [processesPart, quantumPart] = input.split("|");
  const processes = processesPart
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const [id, arrival, burst, priority] = token.split(":");
      return { id, arrival: Number(arrival), burst: Number(burst), priority: Number(priority ?? 0) };
    });
  return { processes, quantum: Number(quantumPart ?? 2) };
}

function fcfsScheduling(input) {
  const { processes } = parseSchedulingInput(input);
  const ordered = [...processes].sort((a, b) => a.arrival - b.arrival);
  const segments = [];
  const metrics = {};
  let time = 0;
  ordered.forEach((process) => {
    time = Math.max(time, process.arrival);
    const start = time;
    time += process.burst;
    segments.push({ label: process.id, start, end: time, color: COLORS.idle });
    metrics[process.id] = { waiting: start - process.arrival, turnaround: time - process.arrival };
  });
  return { steps: [createStep("schedule", "FCFS executes processes in arrival order.", createTimelineState(segments, metrics, { notes: "Simple scheduling, but long jobs can delay short ones." }))], summary: "FCFS runs each process to completion in arrival order." };
}

function roundRobinScheduling(input) {
  const { processes, quantum } = parseSchedulingInput(input);
  const queue = [...processes].sort((a, b) => a.arrival - b.arrival).map((process) => ({ ...process, remaining: process.burst }));
  const ready = [];
  const segments = [];
  const steps = [];
  let time = 0;
  let index = 0;
  while (index < queue.length || ready.length) {
    while (index < queue.length && queue[index].arrival <= time) {
      ready.push(queue[index]);
      index += 1;
    }
    if (!ready.length) {
      time = queue[index].arrival;
      continue;
    }
    const current = ready.shift();
    const run = Math.min(quantum, current.remaining);
    const start = time;
    time += run;
    current.remaining -= run;
    segments.push({ label: current.id, start, end: time, color: current.remaining ? COLORS.warn : COLORS.success });
    steps.push(createStep("timeslice", `Run ${current.id} for ${run} units.`, createTimelineState(segments, { quantum, ready: ready.map((process) => process.id).join(", ") }, { notes: "Unfinished processes go back to the ready queue." })));
    while (index < queue.length && queue[index].arrival <= time) {
      ready.push(queue[index]);
      index += 1;
    }
    if (current.remaining > 0) ready.push(current);
  }
  return { steps, summary: "Round Robin improves fairness by cycling through ready processes with time quanta." };
}

function priorityScheduling(input) {
  const { processes } = parseSchedulingInput(input);
  const ordered = [...processes].sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);
  const segments = [];
  let time = 0;
  ordered.forEach((process) => {
    time = Math.max(time, process.arrival);
    const start = time;
    time += process.burst;
    segments.push({ label: `${process.id} (p${process.priority})`, start, end: time, color: COLORS.violet });
  });
  return { steps: [createStep("schedule", "Higher-priority processes run first.", createTimelineState(segments, {}, { notes: "Lower numeric value means higher priority." }))], summary: "Priority Scheduling favors urgent processes over less urgent ones." };
}

function parseDiskInput(input) {
  const parts = Object.fromEntries(input.split(";").map((token) => token.split("=")).filter((pair) => pair.length === 2));
  return {
    head: Number(parts.head ?? 53),
    requests: parseNumberList(parts.requests ?? ""),
    size: Number(parts.size ?? 200),
    direction: (parts.direction ?? "right").trim(),
  };
}

function sstfDisk(input) {
  const { head, requests, size } = parseDiskInput(input);
  const pending = [...requests];
  const path = [head];
  const steps = [];
  let current = head;
  let totalSeek = 0;
  while (pending.length) {
    pending.sort((a, b) => Math.abs(a - current) - Math.abs(b - current));
    const next = pending.shift();
    totalSeek += Math.abs(next - current);
    current = next;
    path.push(current);
    steps.push(createStep("move", `Serve nearest request ${current}.`, createDiskState(path, { maxTrack: size - 1, totalSeek, notes: `Pending: ${pending.join(", ")}` })));
  }
  return { steps, summary: "SSTF minimizes immediate seek distance by always taking the closest request next." };
}

function scanDisk(input) {
  const { head, requests, size, direction } = parseDiskInput(input);
  const left = requests.filter((value) => value < head).sort((a, b) => b - a);
  const right = requests.filter((value) => value >= head).sort((a, b) => a - b);
  const order = direction === "left" ? [head, ...left, 0, ...right.reverse()] : [head, ...right, size - 1, ...left.reverse()];
  const steps = [];
  let totalSeek = 0;
  for (let i = 1; i < order.length; i += 1) {
    totalSeek += Math.abs(order[i] - order[i - 1]);
    steps.push(createStep("move", `Move head to track ${order[i]}.`, createDiskState(order.slice(0, i + 1), { maxTrack: size - 1, totalSeek, notes: `Direction: ${direction.toUpperCase()}` })));
  }
  return { steps, summary: "SCAN sweeps in one direction, servicing requests like an elevator before reversing." };
}

function recursionTree(input) {
  const n = Number(input.trim()) || 5;
  const nodes = [];
  const edges = [];
  const stack = [];
  const steps = [];
  function walk(value, parentId = null, depth = 0, offset = 0) {
    const id = `${value}-${depth}-${offset}`;
    nodes.push({ id, label: `F(${value})`, x: 280 + offset * 80, y: 70 + depth * 90, color: COLORS.idle });
    if (parentId) edges.push({ from: parentId, to: id, color: COLORS.muted });
    stack.push(`F(${value})`);
    steps.push(createStep("call", `Call F(${value}).`, createRecursionState(nodes, edges, stack, { notes: "Calls push onto the stack before expanding children." })));
    if (value <= 1) {
      stack.pop();
      steps.push(createStep("return", `Return ${value} from F(${value}).`, createRecursionState(nodes, edges, stack)));
      return value;
    }
    const left = walk(value - 1, id, depth + 1, offset - 1);
    const right = walk(value - 2, id, depth + 1, offset + 1);
    stack.pop();
    steps.push(createStep("return", `Return ${left + right} from F(${value}).`, createRecursionState(nodes, edges, stack)));
    return left + right;
  }
  walk(n);
  return { steps, summary: "The recursion view shows both the call tree and the current runtime stack." };
}

function kmp(input) {
  const [textPart, patternPart] = input.split("|");
  const text = (textPart ?? "").trim();
  const pattern = (patternPart ?? "").trim();
  const lps = Array(pattern.length).fill(0);
  const steps = [createStep("build", "Start building the LPS table.", createArrayState(lps, { notes: `Pattern: ${pattern}` }))];
  let len = 0;
  let i = 1;
  while (i < pattern.length) {
    if (pattern[i] === pattern[len]) {
      len += 1;
      lps[i] = len;
      steps.push(createStep("match", `Set LPS[${i}] = ${len}.`, createArrayState(lps, { active: [i] })));
      i += 1;
    } else if (len !== 0) {
      len = lps[len - 1];
      steps.push(createStep("fallback", `Fallback to prefix length ${len}.`, createArrayState(lps, { active: [Math.max(0, i - 1)] })));
    } else {
      lps[i] = 0;
      steps.push(createStep("set-zero", `LPS[${i}] stays 0.`, createArrayState(lps, { active: [i] })));
      i += 1;
    }
  }
  let textIndex = 0;
  let patternIndex = 0;
  while (textIndex < text.length) {
    steps.push(createStep("compare", `Compare text[${textIndex}] with pattern[${patternIndex}].`, createArrayState(text.split("").map((char) => char.charCodeAt(0)), { active: [textIndex], notes: `Text: ${text}` })));
    if (pattern[patternIndex] === text[textIndex]) {
      textIndex += 1;
      patternIndex += 1;
      if (patternIndex === pattern.length) {
        steps.push(createStep("found", `Pattern found at index ${textIndex - patternIndex}.`, createArrayState(lps, { found: [patternIndex - 1], notes: `Match starts at ${textIndex - patternIndex}.` })));
        patternIndex = lps[patternIndex - 1];
      }
    } else if (patternIndex !== 0) {
      patternIndex = lps[patternIndex - 1];
    } else {
      textIndex += 1;
    }
  }
  return { steps, summary: "KMP uses the LPS table to avoid restarting comparisons from scratch." };
}

function rabinKarp(input) {
  const [textPart, patternPart] = input.split("|");
  const text = (textPart ?? "").trim();
  const pattern = (patternPart ?? "").trim();
  const base = 256;
  const mod = 101;
  let patternHash = 0;
  let windowHash = 0;
  let h = 1;
  const steps = [];
  for (let i = 0; i < pattern.length - 1; i += 1) h = (h * base) % mod;
  for (let i = 0; i < pattern.length; i += 1) {
    patternHash = (base * patternHash + pattern.charCodeAt(i)) % mod;
    windowHash = (base * windowHash + text.charCodeAt(i)) % mod;
  }
  steps.push(createStep("hash", `Pattern hash ${patternHash}, initial window hash ${windowHash}.`, createArrayState(text.slice(0, pattern.length).split("").map((char) => char.charCodeAt(0)))));
  for (let i = 0; i <= text.length - pattern.length; i += 1) {
    steps.push(createStep("window", `Inspect window starting at ${i}.`, createArrayState(text.slice(i, i + pattern.length).split("").map((char) => char.charCodeAt(0)), { notes: `Window hash ${windowHash}` })));
    if (patternHash === windowHash) {
      steps.push(createStep("verify", `Hash match at ${i}. Verify actual characters.`, createArrayState(text.slice(i, i + pattern.length).split("").map((char) => char.charCodeAt(0)), { found: [0] })));
    }
    if (i < text.length - pattern.length) {
      windowHash = (base * (windowHash - text.charCodeAt(i) * h) + text.charCodeAt(i + pattern.length)) % mod;
      if (windowHash < 0) windowHash += mod;
    }
  }
  return { steps, summary: "Rabin-Karp uses rolling hashes to compare many substrings cheaply." };
}

function dfsTraversal(input) {
  const { nodes, edges, source } = parseGraphInput(input);
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  edges.forEach((edge) => {
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  });
  const visited = new Set();
  const steps = [];
  function walk(current, parent = null) {
    visited.add(current);
    steps.push(createStep("visit", `Visit ${current} in depth-first order.`, graphStateFromData(nodes, edges, [current], parent ? [`${parent}-${current}`] : [], `Visited: ${[...visited].join(" -> ")}`)));
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        steps.push(createStep("traverse", `Traverse edge ${current} -> ${neighbor}.`, graphStateFromData(nodes, edges, [current, neighbor], [`${current}-${neighbor}`], `Stacking deeper into the graph.`)));
        walk(neighbor, current);
      }
    }
  }
  walk(source);
  return { steps, summary: "DFS follows one branch as deep as possible before backtracking." };
}

function primMst(input) {
  const { nodes, edges, source } = parseGraphInput(input);
  const visited = new Set([source]);
  const mstEdges = [];
  const steps = [createStep("seed", `Start Prim's algorithm from ${source}.`, graphStateFromData(nodes, edges, [source], [], "Grow the MST by adding the cheapest edge to an unvisited node."))];
  while (visited.size < nodes.length) {
    const candidates = edges
      .filter((edge) => (visited.has(edge.from) && !visited.has(edge.to)) || (visited.has(edge.to) && !visited.has(edge.from)))
      .sort((a, b) => a.weight - b.weight);
    const edge = candidates[0];
    if (!edge) break;
    mstEdges.push(`${edge.from}-${edge.to}`);
    visited.add(visited.has(edge.from) ? edge.to : edge.from);
    steps.push(createStep("select", `Select minimum crossing edge ${edge.from}-${edge.to} (${edge.weight}).`, graphStateFromData(nodes, edges, [...visited], mstEdges, `Current MST cost: ${mstEdges.reduce((sum, key) => sum + (edges.find((candidate) => `${candidate.from}-${candidate.to}` === key || `${candidate.to}-${candidate.from}` === key)?.weight ?? 0), 0)}`)));
  }
  return { steps, summary: "Prim's algorithm grows one spanning tree by repeatedly choosing the cheapest crossing edge." };
}

function kruskalMst(input) {
  const { nodes, edges } = parseGraphInput(input);
  const parent = Object.fromEntries(nodes.map((node) => [node.id, node.id]));
  const rank = Object.fromEntries(nodes.map((node) => [node.id, 0]));
  const sorted = [...edges].sort((a, b) => a.weight - b.weight);
  const chosen = [];
  const steps = [];
  function find(value) {
    if (parent[value] !== value) parent[value] = find(parent[value]);
    return parent[value];
  }
  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) return false;
    if (rank[rootA] < rank[rootB]) parent[rootA] = rootB;
    else if (rank[rootA] > rank[rootB]) parent[rootB] = rootA;
    else {
      parent[rootB] = rootA;
      rank[rootA] += 1;
    }
    return true;
  }
  sorted.forEach((edge) => {
    steps.push(createStep("consider", `Consider edge ${edge.from}-${edge.to} (${edge.weight}).`, graphStateFromData(nodes, edges, [edge.from, edge.to], [`${edge.from}-${edge.to}`], `Chosen edges: ${chosen.join(", ") || "none"}`)));
    if (union(edge.from, edge.to)) {
      chosen.push(`${edge.from}-${edge.to}`);
      steps.push(createStep("accept", `Accept edge ${edge.from}-${edge.to}; it does not form a cycle.`, graphStateFromData(nodes, edges, [], chosen, `Current MST cost: ${chosen.reduce((sum, key) => sum + (edges.find((candidate) => `${candidate.from}-${candidate.to}` === key || `${candidate.to}-${candidate.from}` === key)?.weight ?? 0), 0)}`)));
    } else {
      steps.push(createStep("reject", `Reject edge ${edge.from}-${edge.to}; it would form a cycle.`, graphStateFromData(nodes, edges, [], chosen, `Chosen edges stay unchanged.`)));
    }
  });
  return { steps, summary: "Kruskal's algorithm sorts edges globally and adds only those that connect different components." };
}

function bellmanFord(input) {
  const { nodes, edges, source } = parseGraphInput(input);
  const distances = Object.fromEntries(nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]));
  distances[source] = 0;
  const steps = [createStep("seed", `Initialize Bellman-Ford from ${source}.`, graphStateFromData(nodes, edges, [source], [], `Distances: ${JSON.stringify(distances)}`))];
  for (let round = 1; round < nodes.length; round += 1) {
    edges.forEach((edge) => {
      const before = distances[edge.to];
      if (distances[edge.from] + edge.weight < distances[edge.to]) {
        distances[edge.to] = distances[edge.from] + edge.weight;
      }
      if (distances[edge.to] !== before) {
        steps.push(createStep("relax", `Round ${round}: relax ${edge.from} -> ${edge.to}.`, graphStateFromData(nodes, edges, [edge.to], [`${edge.from}-${edge.to}`], `Distances: ${JSON.stringify(distances)}`)));
      }
      const reverseBefore = distances[edge.from];
      if (distances[edge.to] + edge.weight < distances[edge.from]) {
        distances[edge.from] = distances[edge.to] + edge.weight;
      }
      if (distances[edge.from] !== reverseBefore) {
        steps.push(createStep("relax", `Round ${round}: relax ${edge.to} -> ${edge.from}.`, graphStateFromData(nodes, edges, [edge.from], [`${edge.to}-${edge.from}`], `Distances: ${JSON.stringify(distances)}`)));
      }
    });
  }
  return { steps, summary: "Bellman-Ford relaxes every edge repeatedly, which lets it handle negative weights." };
}

function floydWarshall(input) {
  const { nodes, edges } = parseGraphInput(input);
  const labels = nodes.map((node) => node.id);
  const indexById = Object.fromEntries(labels.map((label, index) => [label, index]));
  const matrix = Array.from({ length: labels.length }, (_, row) =>
    Array.from({ length: labels.length }, (_, col) => (row === col ? 0 : "∞")),
  );
  edges.forEach((edge) => {
    matrix[indexById[edge.from]][indexById[edge.to]] = edge.weight;
    matrix[indexById[edge.to]][indexById[edge.from]] = edge.weight;
  });
  const steps = [createStep("seed", "Initialize the all-pairs distance matrix.", createTableState(matrix, { rowLabels: labels, colLabels: labels }))];
  for (let k = 0; k < labels.length; k += 1) {
    for (let i = 0; i < labels.length; i += 1) {
      for (let j = 0; j < labels.length; j += 1) {
        const throughK =
          matrix[i][k] === "∞" || matrix[k][j] === "∞" ? Number.POSITIVE_INFINITY : Number(matrix[i][k]) + Number(matrix[k][j]);
        const current = matrix[i][j] === "∞" ? Number.POSITIVE_INFINITY : Number(matrix[i][j]);
        if (throughK < current) {
          matrix[i][j] = throughK;
        }
        steps.push(createStep("update", `Try improving ${labels[i]} -> ${labels[j]} through ${labels[k]}.`, createTableState(matrix, { rowLabels: labels, colLabels: labels, highlights: [[i, j], [i, k], [k, j]], notes: `Intermediate node: ${labels[k]}` })));
      }
    }
  }
  return { steps, summary: "Floyd-Warshall considers every node as an intermediate stop for every source-target pair." };
}

function matrixChain(input) {
  const dims = parseNumberList(input);
  const n = dims.length - 1;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  const labels = Array.from({ length: n }, (_, index) => `A${index + 1}`);
  const steps = [createStep("seed", "Initialize matrix-chain cost table.", createTableState(matrix, { rowLabels: labels, colLabels: labels }))];
  for (let length = 2; length <= n; length += 1) {
    for (let i = 0; i <= n - length; i += 1) {
      const j = i + length - 1;
      matrix[i][j] = Number.POSITIVE_INFINITY;
      for (let k = i; k < j; k += 1) {
        const cost = matrix[i][k] + matrix[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
        if (cost < matrix[i][j]) matrix[i][j] = cost;
        steps.push(createStep("split", `Try split between A${k + 1} and A${k + 2} for chain A${i + 1}..A${j + 1}.`, createTableState(matrix, { rowLabels: labels, colLabels: labels, highlights: [[i, j], [i, k], [k + 1, j]] })));
      }
    }
  }
  return { steps, summary: "Matrix Chain Multiplication finds the parenthesization with the fewest scalar multiplications." };
}

function sjfScheduling(input) {
  const { processes } = parseSchedulingInput(input);
  const pending = [...processes].sort((a, b) => a.arrival - b.arrival);
  const ready = [];
  const segments = [];
  const steps = [];
  let time = 0;
  while (pending.length || ready.length) {
    while (pending.length && pending[0].arrival <= time) ready.push(pending.shift());
    if (!ready.length) {
      time = pending[0].arrival;
      continue;
    }
    ready.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
    const current = ready.shift();
    const start = time;
    time += current.burst;
    segments.push({ label: current.id, start, end: time, color: COLORS.success });
    steps.push(createStep("schedule", `Run shortest available job ${current.id}.`, createTimelineState(segments, { clock: time, ready: ready.map((process) => process.id).join(", ") }, { notes: "Non-preemptive SJF picks the smallest burst among arrived processes." })));
  }
  return { steps, summary: "SJF minimizes average waiting time by choosing the shortest ready burst next." };
}

function fcfsDisk(input) {
  const { head, requests, size } = parseDiskInput(input);
  const order = [head, ...requests];
  const steps = [];
  let totalSeek = 0;
  for (let i = 1; i < order.length; i += 1) {
    totalSeek += Math.abs(order[i] - order[i - 1]);
    steps.push(createStep("move", `Serve request ${order[i]} in arrival order.`, createDiskState(order.slice(0, i + 1), { maxTrack: size - 1, totalSeek, notes: "FCFS follows request order exactly." })));
  }
  return { steps, summary: "FCFS disk scheduling processes requests strictly in the order they arrive." };
}

function cscanDisk(input) {
  const { head, requests, size } = parseDiskInput(input);
  const left = requests.filter((value) => value < head).sort((a, b) => a - b);
  const right = requests.filter((value) => value >= head).sort((a, b) => a - b);
  const order = [head, ...right, size - 1, 0, ...left];
  const steps = [];
  let totalSeek = 0;
  for (let i = 1; i < order.length; i += 1) {
    totalSeek += Math.abs(order[i] - order[i - 1]);
    const note = i === right.length + 1 ? "Jump from the end back to the beginning without servicing on the return." : "Continue scanning in one direction.";
    steps.push(createStep("move", `Move disk head to ${order[i]}.`, createDiskState(order.slice(0, i + 1), { maxTrack: size - 1, totalSeek, notes: note })));
  }
  return { steps, summary: "C-SCAN services requests in one direction and wraps around to maintain uniform wait times." };
}

function maxHeapOperations(input) {
  const operations = input.split(",").map((token) => token.trim()).filter(Boolean);
  const heap = [];
  const steps = [];
  function snapshot(activeIndex = null, note = "") {
    const nodes = heap.map((value, index) => ({
      id: `${value}-${index}`,
      label: String(value),
      value,
      x: 80 + (index % 4) * 120,
      y: 80 + Math.floor(index / 4) * 100,
      color: activeIndex === index ? COLORS.active : COLORS.idle,
    }));
    const edges = heap.flatMap((_value, index) => [2 * index + 1, 2 * index + 2]
      .filter((child) => child < heap.length)
      .map((child) => ({ from: `${heap[index]}-${index}`, to: `${heap[child]}-${child}`, color: COLORS.muted })));
    return createTreeState(nodes, edges, { notes: note, footer: `Array form: [${heap.join(", ")}]` });
  }
  function bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      steps.push(createStep("compare", `Compare child ${heap[index]} with parent ${heap[parent]}.`, snapshot(index)));
      if (heap[parent] >= heap[index]) break;
      [heap[parent], heap[index]] = [heap[index], heap[parent]];
      steps.push(createStep("swap", "Swap to restore max-heap order.", snapshot(parent)));
      index = parent;
    }
  }
  operations.forEach((operation) => {
    const [command, rawValue] = operation.split(/\s+/);
    if (command?.toLowerCase() === "insert") {
      heap.push(Number(rawValue));
      steps.push(createStep("insert", `Insert ${rawValue} at the end.`, snapshot(heap.length - 1)));
      bubbleUp(heap.length - 1);
    } else if (command?.toLowerCase() === "extract") {
      if (!heap.length) return;
      const removed = heap[0];
      const last = heap.pop();
      if (heap.length) heap[0] = last;
      steps.push(createStep("extract", `Extract max ${removed} from the root.`, snapshot(0)));
    }
  });
  return { steps, summary: "A max heap keeps the largest key at the root for fast priority access." };
}

function priorityQueueOperations(input) {
  const operations = input.split(",").map((token) => token.trim()).filter(Boolean);
  const queue = [];
  const steps = [createStep("seed", "Priority queue starts empty.", createStructureState([], "queue"))];
  operations.forEach((operation) => {
    const [command, payload] = operation.split(/\s+/, 2);
    if (command?.toLowerCase() === "enqueue") {
      const [name, priorityRaw] = (payload ?? "").split(":");
      queue.push({ name, priority: Number(priorityRaw ?? 0) });
      queue.sort((a, b) => a.priority - b.priority);
      steps.push(createStep("enqueue", `Enqueue ${name} with priority ${priorityRaw}.`, createStructureState(queue.map((item, index) => ({ id: `${item.name}-${index}`, value: `${item.name} (p${item.priority})`, state: index === 0 ? "active" : "idle" })), "queue", { pointers: ["highest priority at front"] })));
    } else if (command?.toLowerCase() === "dequeue") {
      const removed = queue.shift();
      steps.push(createStep("dequeue", `Dequeue ${removed?.name ?? "nothing"} with the highest priority.`, createStructureState(queue.map((item, index) => ({ id: `${item.name}-${index}`, value: `${item.name} (p${item.priority})`, state: index === 0 ? "active" : "idle" })), "queue", { pointers: queue.length ? ["highest priority at front"] : [] })));
    }
  });
  return { steps, summary: "Priority queues always remove the most urgent element next rather than the oldest one." };
}

function assignmentBranchBound(input) {
  const matrix = input
    .split("/")
    .map((row) => row.split(",").map((value) => Number(value.trim())))
    .filter((row) => row.length);
  const workerLabels = matrix.map((_, index) => `W${index + 1}`);
  const jobLabels = matrix[0]?.map((_, index) => `J${index + 1}`) ?? [];
  const steps = [createStep("seed", "Start Branch and Bound on the assignment matrix.", createTableState(matrix, { rowLabels: workerLabels, colLabels: jobLabels, notes: "Assign one job per worker while pruning expensive branches." }))];
  let bestCost = Number.POSITIVE_INFINITY;
  let bestAssignment = [];
  const rowMins = matrix.map((row) => Math.min(...row));

  function search(worker, usedJobs, chosen, cost) {
    const lowerBound = cost + rowMins.slice(worker).reduce((sum, value) => sum + value, 0);
    steps.push(createStep("branch", `Branch at worker ${worker + 1}. Current cost ${cost}, lower bound ${lowerBound}.`, createTableState(matrix, { rowLabels: workerLabels, colLabels: jobLabels, highlights: chosen, notes: `Best cost so far: ${Number.isFinite(bestCost) ? bestCost : "none"}` })));
    if (lowerBound >= bestCost) {
      steps.push(createStep("prune", `Prune this branch because ${lowerBound} is not better than best cost ${bestCost}.`, createTableState(matrix, { rowLabels: workerLabels, colLabels: jobLabels, highlights: chosen, notes: "Bound exceeded the best known solution." })));
      return;
    }
    if (worker === matrix.length) {
      bestCost = cost;
      bestAssignment = [...chosen];
      steps.push(createStep("update-best", `Found a new best assignment with cost ${bestCost}.`, createTableState(matrix, { rowLabels: workerLabels, colLabels: jobLabels, highlights: bestAssignment, notes: `Optimal-so-far assignment updated.` })));
      return;
    }
    for (let job = 0; job < matrix[worker].length; job += 1) {
      if (usedJobs.has(job)) continue;
      usedJobs.add(job);
      chosen.push([worker, job]);
      steps.push(createStep("choose", `Assign worker ${worker + 1} to job ${job + 1} (cost ${matrix[worker][job]}).`, createTableState(matrix, { rowLabels: workerLabels, colLabels: jobLabels, highlights: chosen, notes: `Accumulated cost: ${cost + matrix[worker][job]}` })));
      search(worker + 1, usedJobs, chosen, cost + matrix[worker][job]);
      chosen.pop();
      usedJobs.delete(job);
    }
  }

  search(0, new Set(), [], 0);
  return { steps, summary: "Branch and Bound explores assignments selectively and prunes branches whose lower bound cannot beat the current best solution." };
}

export const algorithmCatalog = [
  buildBarCatalogEntry("bubble-sort", "Bubble Sort", "Visualize adjacent swaps and the gradual emergence of a sorted suffix.", { time: "O(n^2)", space: "O(1)" }, ["repeat n times", "compare adjacent values", "swap inverted pairs"], bubbleSort),
  buildBarCatalogEntry("selection-sort", "Selection Sort", "Track the current minimum and watch each pass lock one more value.", { time: "O(n^2)", space: "O(1)" }, ["for each index i", "find minimum in suffix", "swap into position i"], selectionSort),
  buildBarCatalogEntry("insertion-sort", "Insertion Sort", "See the sorted prefix grow while larger elements shift right.", { time: "O(n^2)", space: "O(1)" }, ["start from second item", "shift larger values right", "insert key into gap"], insertionSort),
  buildBarCatalogEntry("merge-sort", "Merge Sort", "Follow divide-and-conquer merges across subarray boundaries.", { time: "O(n log n)", space: "O(n)" }, ["split array recursively", "merge sorted halves", "copy leftovers"], mergeSort),
  buildBarCatalogEntry("quick-sort", "Quick Sort", "Observe pivot selection, partitioning, and recursive refinement.", { time: "O(n log n) avg", space: "O(log n)" }, ["choose pivot", "partition <= pivot", "recurse on both partitions"], quickSort),
  buildBarCatalogEntry("heap-sort", "Heap Sort", "Build a max-heap and extract roots one by one.", { time: "O(n log n)", space: "O(1)" }, ["build max heap", "swap root with end", "heapify reduced heap"], heapSort),
  { id: "linear-search", title: "Linear Search", section: "Searching Algorithms", description: "Step through each probe until the target is found or exhausted.", defaultInput: "2,4,6,8,10,12|10", inputLabel: "Array | Target", inputHint: "Example: 2,4,6,8|6", complexity: { time: "O(n)", space: "O(1)" }, pseudocode: ["for each index", "if value == target return index", "otherwise continue"], generate: linearSearch, makeSyntheticInput: (values) => `${values.join(",")}|${values[Math.floor(values.length / 2)]}` },
  { id: "binary-search", title: "Binary Search", section: "Searching Algorithms", description: "Highlight the midpoint and the eliminated regions at each step.", defaultInput: "1,4,7,9,12,15,18|12", inputLabel: "Sorted Array | Target", inputHint: "Example: 1,4,7,9|7", complexity: { time: "O(log n)", space: "O(1)" }, pseudocode: ["low = 0, high = n - 1", "check middle", "discard impossible half"], generate: binarySearch, makeSyntheticInput: (values) => `${values.sort((a, b) => a - b).join(",")}|${values[2] ?? 0}` },
  { id: "jump-search", title: "Jump Search", section: "Searching Algorithms", description: "Use square-root jumps to find a block before scanning locally.", defaultInput: "1,4,7,9,12,15,18,21,24|18", inputLabel: "Sorted Array | Target", inputHint: "Example: 1,4,7,9|9", complexity: { time: "O(√n)", space: "O(1)" }, pseudocode: ["jump by block size", "stop when block can contain target", "scan inside block"], generate: jumpSearch, makeSyntheticInput: (values) => `${values.sort((a, b) => a - b).join(",")}|${values[Math.floor(values.length / 2)]}` },
  { id: "interpolation-search", title: "Interpolation Search", section: "Searching Algorithms", description: "Estimate likely target positions inside sorted, near-uniform data.", defaultInput: "10,20,30,40,50,60,70,80|60", inputLabel: "Sorted Array | Target", inputHint: "Example: 10,20,30,40|30", complexity: { time: "O(log log n) avg", space: "O(1)" }, pseudocode: ["estimate probe position", "compare target with probe", "shrink bounds"], generate: interpolationSearch, makeSyntheticInput: (values) => `${values.sort((a, b) => a - b).join(",")}|${values[Math.floor(values.length / 2)]}` },
  { id: "stack-ops", title: "Stack Operations", section: "Data Structures", description: "Push and pop values while watching the top pointer.", defaultInput: "push 7,push 3,push 9,pop,push 2", inputLabel: "Operations", inputHint: "Example: push 4,pop,push 8", complexity: { time: "O(1) per op", space: "O(n)" }, pseudocode: ["push adds to top", "pop removes top element"], generate: stackOperations },
  { id: "circular-queue", title: "Circular Queue", section: "Data Structures", description: "Track front and rear updates during enqueue and dequeue.", defaultInput: "enqueue 4,enqueue 7,enqueue 9,dequeue,enqueue 2", inputLabel: "Operations", inputHint: "Example: enqueue 1,dequeue", complexity: { time: "O(1) per op", space: "O(n)" }, pseudocode: ["enqueue at rear", "dequeue at front", "wrap around capacity"], generate: circularQueueOperations },
  { id: "linked-list", title: "Linked List", section: "Data Structures", description: "Visualize insertions and deletions with head/tail context.", defaultInput: "insert 5,insert 8,insert 13,delete 8,insert 21", inputLabel: "Operations", inputHint: "Example: insert 5,delete 5", complexity: { time: "O(1) tail insert / O(n) delete", space: "O(n)" }, pseudocode: ["create or remove nodes", "update links around affected nodes"], generate: linkedListOperations },
  { id: "bst", title: "Binary Search Tree", section: "Trees", description: "Insert nodes and see the ordered tree shape emerge.", defaultInput: "30,15,45,7,22,37,52", inputLabel: "Insert Sequence", inputHint: "Example: 20,10,30,5,15", complexity: { time: "O(log n) avg", space: "O(n)" }, pseudocode: ["start at root", "go left if smaller", "go right if larger"], generate: bstInsertion, makeSyntheticInput: (values) => values.join(",") },
  { id: "avl", title: "AVL Tree", section: "Trees", description: "See balanced-tree insertions with rebalance notes.", defaultInput: "30,20,10,25,40,50", inputLabel: "Insert Sequence", inputHint: "Example: 30,20,10", complexity: { time: "O(log n)", space: "O(n)" }, pseudocode: ["insert like BST", "compute balance factor", "rotate if imbalance appears"], generate: avlInsertion, makeSyntheticInput: (values) => values.join(",") },
  { id: "red-black-tree", title: "Red-Black Tree", section: "Trees", description: "Insert red nodes, recolor conflicts, and rotate to preserve Red-Black invariants.", defaultInput: "10,20,30,15,25,5,1", inputLabel: "Insert Sequence", inputHint: "Example: 10,20,30,15,25", complexity: { time: "O(log n)", space: "O(n)" }, pseudocode: ["insert new node as red", "if parent and uncle are red, recolor", "otherwise rotate and recolor", "force root to black"], generate: redBlackInsertion, makeSyntheticInput: (values) => values.join(",") },
  { id: "min-heap", title: "Min Heap", section: "Heap", description: "Watch heapify-up maintain the min-heap property.", defaultInput: "insert 14,insert 9,insert 20,insert 4,insert 7", inputLabel: "Heap Operations", inputHint: "Example: insert 5,insert 2", complexity: { time: "O(log n) per update", space: "O(n)" }, pseudocode: ["insert at end", "bubble up smaller children", "root stores minimum"], generate: minHeapOperations },
  { id: "max-heap", title: "Max Heap", section: "Heap", description: "Track max-heap inserts and root extraction behavior.", defaultInput: "insert 14,insert 9,insert 20,insert 4,insert 25,extract", inputLabel: "Heap Operations", inputHint: "Example: insert 5,insert 8,extract", complexity: { time: "O(log n) per update", space: "O(n)" }, pseudocode: ["insert at end", "bubble up larger children", "root stores maximum"], generate: maxHeapOperations },
  { id: "priority-queue", title: "Priority Queue", section: "Heap", description: "Visualize ordered service by urgency instead of arrival order.", defaultInput: "enqueue TaskA:3,enqueue TaskB:1,enqueue TaskC:2,dequeue", inputLabel: "Queue Operations", inputHint: "Example: enqueue Job:2,dequeue", complexity: { time: "O(log n) enqueue / O(log n) dequeue", space: "O(n)" }, pseudocode: ["insert with priority", "maintain priority order", "dequeue highest-priority item"], generate: priorityQueueOperations },
  { id: "bfs", title: "Breadth-First Search", section: "Graph Algorithms", description: "Explore neighbors level by level using a queue.", defaultInput: "A-B:1,A-C:1,B-D:1,C-E:1,D-F:1,E-F:1|A", inputLabel: "Edges | Source", inputHint: "Example: A-B:1,B-C:1|A", complexity: { time: "O(V + E)", space: "O(V)" }, pseudocode: ["enqueue source", "visit node", "enqueue unvisited neighbors"], generate: bfsTraversal },
  { id: "dfs", title: "Depth-First Search", section: "Graph Algorithms", description: "Follow one branch deeply before backtracking across the graph.", defaultInput: "A-B:1,A-C:1,B-D:1,C-E:1,D-F:1,E-F:1|A", inputLabel: "Edges | Source", inputHint: "Example: A-B:1,B-C:1|A", complexity: { time: "O(V + E)", space: "O(V)" }, pseudocode: ["visit source", "recurse on each unvisited neighbor", "backtrack when a branch ends"], generate: dfsTraversal },
  { id: "dijkstra", title: "Dijkstra", section: "Graph Algorithms", description: "Relax weighted edges and settle shortest-path distances.", defaultInput: "A-B:4,A-C:2,B-C:1,B-D:5,C-D:8,C-E:10,D-E:2|A", inputLabel: "Weighted Edges | Source", inputHint: "Example: A-B:2,B-C:3|A", complexity: { time: "O(V^2) / O((V+E) log V)", space: "O(V)" }, pseudocode: ["initialize distances", "settle nearest node", "relax outgoing edges"], generate: dijkstra },
  { id: "prim", title: "Prim's Algorithm", section: "Graph Algorithms", description: "Build a minimum spanning tree by expanding from one growing component.", defaultInput: "A-B:4,A-C:2,B-C:1,B-D:5,C-D:8,C-E:10,D-E:2|A", inputLabel: "Weighted Edges | Source", inputHint: "Example: A-B:2,B-C:3|A", complexity: { time: "O(V^2) / O(E log V)", space: "O(V)" }, pseudocode: ["start from any node", "pick minimum crossing edge", "add new vertex to MST"], generate: primMst },
  { id: "kruskal", title: "Kruskal's Algorithm", section: "Graph Algorithms", description: "Sort all edges globally and skip any that create cycles.", defaultInput: "A-B:4,A-C:2,B-C:1,B-D:5,C-D:8,C-E:10,D-E:2|A", inputLabel: "Weighted Edges", inputHint: "Example: A-B:2,B-C:3,C-D:4", complexity: { time: "O(E log E)", space: "O(V)" }, pseudocode: ["sort edges by weight", "union different components", "reject cycle-forming edges"], generate: kruskalMst },
  { id: "bellman-ford", title: "Bellman-Ford", section: "Graph Algorithms", description: "Relax edges repeatedly to support negative-weight shortest paths.", defaultInput: "A-B:4,A-C:5,B-C:-2,B-D:6,C-D:1|A", inputLabel: "Weighted Edges | Source", inputHint: "Example: A-B:4,B-C:-1,C-D:2|A", complexity: { time: "O(VE)", space: "O(V)" }, pseudocode: ["initialize distances", "relax all edges V-1 times", "check for further improvements"], generate: bellmanFord },
  { id: "floyd-warshall", title: "Floyd-Warshall", section: "Graph Algorithms", description: "Compute all-pairs shortest paths through progressively richer intermediates.", defaultInput: "A-B:3,A-D:7,B-C:1,C-D:2,B-D:5|A", inputLabel: "Weighted Edges", inputHint: "Example: A-B:3,B-C:1,C-D:2", complexity: { time: "O(V^3)", space: "O(V^2)" }, pseudocode: ["initialize distance matrix", "for each intermediate k", "improve every i,j pair through k"], generate: floydWarshall },
  { id: "topological-sort", title: "Topological Sort", section: "Graph Algorithms", description: "Reduce indegrees to produce a valid DAG ordering.", defaultInput: "A-C:1,B-C:1,B-D:1,C-E:1,D-F:1,E-F:1|A", inputLabel: "Directed Edges", inputHint: "Example: A-B:1,A-C:1,B-D:1", complexity: { time: "O(V + E)", space: "O(V)" }, pseudocode: ["queue indegree-zero nodes", "output one", "reduce neighbor indegrees"], generate: topologicalSort },
  { id: "activity-selection", title: "Activity Selection", section: "Greedy Algorithms", description: "Choose the next compatible activity with the earliest finish time.", defaultInput: "1-4,3-5,0-6,5-7,3-9,5-9,6-10,8-11,8-12,2-14,12-16", inputLabel: "start-finish pairs", inputHint: "Example: 1-2,3-4,0-6", complexity: { time: "O(n log n)", space: "O(1)" }, pseudocode: ["sort by finish time", "pick first activity", "skip overlapping ones"], generate: activitySelection },
  { id: "fractional-knapsack", title: "Fractional Knapsack", section: "Greedy Algorithms", description: "Fill capacity using the best value-to-weight ratio first.", defaultInput: "weights=10,20,30;values=60,100,120;capacity=50", inputLabel: "weights / values / capacity", inputHint: "Example: weights=5,10;values=10,40;capacity=12", complexity: { time: "O(n log n)", space: "O(1)" }, pseudocode: ["compute value density", "sort descending by density", "take whole or fractional items"], generate: fractionalKnapsack },
  { id: "huffman", title: "Huffman Coding", section: "Greedy Algorithms", description: "Merge the least frequent symbols into an optimal prefix tree.", defaultInput: "datastructures", inputLabel: "Source Text", inputHint: "Example: mississippi", complexity: { time: "O(n log n)", space: "O(n)" }, pseudocode: ["count frequencies", "push into min heap", "merge two smallest repeatedly"], generate: huffmanCoding },
  { id: "knapsack-dp", title: "0/1 Knapsack", section: "Dynamic Programming", description: "Fill the DP table to compare include-vs-exclude decisions.", defaultInput: "weights=2,3,4,5;values=3,4,5,8;capacity=8", inputLabel: "weights / values / capacity", inputHint: "Example: weights=2,3;values=5,6;capacity=5", complexity: { time: "O(nW)", space: "O(nW)" }, pseudocode: ["dp[i][w] = best using first i items", "compare include vs exclude"], generate: zeroOneKnapsack },
  { id: "lcs", title: "Longest Common Subsequence", section: "Dynamic Programming", description: "Visualize table updates for matching and mismatching characters.", defaultInput: "ABCBDAB|BDCABA", inputLabel: "String A | String B", inputHint: "Example: ABC|AC", complexity: { time: "O(mn)", space: "O(mn)" }, pseudocode: ["if chars match => diagonal + 1", "else max(top, left)"], generate: lcs },
  { id: "fibonacci-dp", title: "Fibonacci DP", section: "Dynamic Programming", description: "Compare iterative memoization against expensive recursion.", defaultInput: "8", inputLabel: "n", inputHint: "Example: 10", complexity: { time: "O(n)", space: "O(n)" }, pseudocode: ["seed F(0), F(1)", "build up to F(n) iteratively"], generate: fibonacciDp, makeSyntheticInput: (values) => String(values.length + 4) },
  { id: "matrix-chain", title: "Matrix Chain Multiplication", section: "Dynamic Programming", description: "Minimize scalar multiplications by choosing the best split points.", defaultInput: "30,35,15,5,10,20,25", inputLabel: "Matrix Dimensions", inputHint: "Example: 10,20,30,40", complexity: { time: "O(n^3)", space: "O(n^2)" }, pseudocode: ["consider chain lengths", "try every split k", "store minimum multiplication cost"], generate: matrixChain, makeSyntheticInput: (values) => values.slice(0, 6).map((value) => Math.max(2, value)).join(",") },
  { id: "n-queens", title: "N-Queens", section: "Backtracking", description: "Place queens row by row and watch backtracking undo bad choices.", defaultInput: "4", inputLabel: "Board Size", inputHint: "Example: 4", complexity: { time: "O(n!)", space: "O(n)" }, pseudocode: ["try each column in row", "place if safe", "backtrack on dead end"], generate: nQueens, makeSyntheticInput: (values) => String(Math.min(6, values.length)) },
  { id: "sudoku", title: "Sudoku Solver", section: "Backtracking", description: "Fill cells with legal values and unwind when constraints fail.", defaultInput: "530070000600195000098000060800060003400803001700020006060000280000419005000080079", inputLabel: "81-cell Sudoku String", inputHint: "Use 0 for blanks", complexity: { time: "Exponential worst case", space: "O(81)" }, pseudocode: ["find empty cell", "try legal digits", "recurse and backtrack"], generate: sudokuSolver },
  { id: "rat-maze", title: "Rat in a Maze", section: "Backtracking", description: "Trace exploratory moves and reversals through a grid.", defaultInput: "0000/0100/0000/0010", inputLabel: "Maze Rows", inputHint: "Use 0=open, 1=wall, separated by /", complexity: { time: "Exponential worst case", space: "O(n^2)" }, pseudocode: ["move in four directions", "mark visited", "backtrack on dead end"], generate: ratInMaze },
  { id: "assignment-bnb", title: "Assignment Branch & Bound", section: "Branch and Bound", description: "Solve a minimum-cost assignment by pruning branches that cannot beat the best known answer.", defaultInput: "9,2,7,8/6,4,3,7/5,8,1,8/7,6,9,4", inputLabel: "Cost Matrix", inputHint: "Rows separated by /, columns by commas", complexity: { time: "Exponential worst case with pruning", space: "O(n^2)" }, pseudocode: ["compute lower bound", "branch on next worker assignment", "prune if bound >= best cost"], generate: assignmentBranchBound, makeSyntheticInput: (values) => `${values.slice(0, 4).join(",")}/${values.slice(1, 5).join(",")}/${values.slice(2, 6).join(",")}/${values.slice(3, 7).join(",")}` },
  { id: "fcfs", title: "FCFS Scheduling", section: "OS Scheduling", description: "Draw a Gantt chart and compute waiting/turnaround times.", defaultInput: "P1:0:5:2,P2:1:3:1,P3:2:4:3", inputLabel: "id:arrival:burst:priority", inputHint: "Example: P1:0:3:2,P2:2:4:1", complexity: { time: "O(n log n)", space: "O(n)" }, pseudocode: ["sort by arrival time", "run each process to completion"], generate: fcfsScheduling },
  { id: "sjf", title: "SJF Scheduling", section: "OS Scheduling", description: "Pick the shortest ready burst to reduce average waiting time.", defaultInput: "P1:0:7:2,P2:2:4:1,P3:4:1:3,P4:5:4:2", inputLabel: "id:arrival:burst:priority", inputHint: "Example: P1:0:7:2,P2:2:4:1", complexity: { time: "O(n^2)", space: "O(n)" }, pseudocode: ["enqueue arrived jobs", "choose shortest burst", "run to completion"], generate: sjfScheduling },
  { id: "round-robin", title: "Round Robin", section: "OS Scheduling", description: "Visualize time slices, queue rotation, and fairness.", defaultInput: "P1:0:5:2,P2:1:4:1,P3:2:3:3|2", inputLabel: "Processes | Quantum", inputHint: "Example: P1:0:5:2,P2:1:3:1|2", complexity: { time: "O(total slices)", space: "O(n)" }, pseudocode: ["enqueue arrivals", "run for quantum", "requeue unfinished process"], generate: roundRobinScheduling },
  { id: "priority", title: "Priority Scheduling", section: "OS Scheduling", description: "Observe how process priority changes execution order.", defaultInput: "P1:0:5:3,P2:0:3:1,P3:1:4:2", inputLabel: "id:arrival:burst:priority", inputHint: "Lower value means higher priority", complexity: { time: "O(n log n)", space: "O(n)" }, pseudocode: ["pick highest priority ready process", "run to completion"], generate: priorityScheduling },
  { id: "disk-fcfs", title: "FCFS Disk Scheduling", section: "Disk Scheduling", description: "Follow requests strictly in arrival order and observe the seek cost.", defaultInput: "head=53;requests=98,183,37,122,14,124,65,67;size=200;direction=right", inputLabel: "Disk Config", inputHint: "head=53;requests=98,183,37;size=200", complexity: { time: "O(n)", space: "O(n)" }, pseudocode: ["start at head", "serve each request in order", "accumulate seek distance"], generate: fcfsDisk },
  { id: "sstf", title: "SSTF Disk Scheduling", section: "Disk Scheduling", description: "Track disk-head movement to the nearest pending request.", defaultInput: "head=53;requests=98,183,37,122,14,124,65,67;size=200;direction=right", inputLabel: "Disk Config", inputHint: "head=53;requests=98,183,37;size=200", complexity: { time: "O(n^2)", space: "O(n)" }, pseudocode: ["pick nearest request", "move head", "remove request"], generate: sstfDisk },
  { id: "scan", title: "SCAN Disk Scheduling", section: "Disk Scheduling", description: "Show elevator-style sweeps and total seek cost.", defaultInput: "head=53;requests=98,183,37,122,14,124,65,67;size=200;direction=right", inputLabel: "Disk Config", inputHint: "head=53;requests=98,183,37;size=200;direction=left", complexity: { time: "O(n log n)", space: "O(n)" }, pseudocode: ["sort requests", "move in one direction", "reverse at the boundary"], generate: scanDisk },
  { id: "cscan", title: "C-SCAN Disk Scheduling", section: "Disk Scheduling", description: "Scan in one direction, then wrap around for more uniform wait times.", defaultInput: "head=53;requests=98,183,37,122,14,124,65,67;size=200;direction=right", inputLabel: "Disk Config", inputHint: "head=53;requests=98,183,37;size=200", complexity: { time: "O(n log n)", space: "O(n)" }, pseudocode: ["sort requests", "move only forward", "wrap to the beginning"], generate: cscanDisk },
  { id: "recursion-tree", title: "Recursion Visualizer", section: "Recursion Visualizer", description: "Display the recursive call tree and the current call stack.", defaultInput: "5", inputLabel: "n", inputHint: "Example: 5", complexity: { time: "O(2^n) for naive Fibonacci", space: "O(n)" }, pseudocode: ["call F(n-1)", "call F(n-2)", "return sum"], generate: recursionTree, makeSyntheticInput: (values) => String(Math.min(6, values.length)) },
  { id: "kmp", title: "KMP Algorithm", section: "String Algorithms", description: "Build the LPS array and then match the pattern efficiently.", defaultInput: "ABABDABACDABABCABAB|ABABCABAB", inputLabel: "Text | Pattern", inputHint: "Example: AABAACAADAABAABA|AABA", complexity: { time: "O(n + m)", space: "O(m)" }, pseudocode: ["build LPS", "scan text", "fallback with LPS on mismatch"], generate: kmp },
  { id: "rabin-karp", title: "Rabin-Karp", section: "String Algorithms", description: "Slide a rolling hash window across the text.", defaultInput: "GEEKSFORGEEKS|GEEK", inputLabel: "Text | Pattern", inputHint: "Example: ABCDEFG|CDE", complexity: { time: "O(n + m) avg", space: "O(1)" }, pseudocode: ["hash pattern and first window", "slide window", "verify on hash match"], generate: rabinKarp },
];

export const sections = Array.from(new Set(algorithmCatalog.map((entry) => entry.section)));

export function getAlgorithmById(id) {
  return algorithmCatalog.find((entry) => entry.id === id) ?? algorithmCatalog[0];
}

export function runAlgorithm(id, input) {
  const algorithm = getAlgorithmById(id);
  const result = algorithm.generate(input);
  return {
    algorithm,
    ...result,
    complexitySeries: measureComplexity(algorithm, input),
    metrics: buildComparator(algorithm, input),
  };
}

export function compareAlgorithms(primaryId, secondaryId, input) {
  return [primaryId, secondaryId].map((id) => {
    const algorithm = getAlgorithmById(id);
    return {
      id,
      section: algorithm.section,
      ...buildComparator(algorithm, input),
      complexity: algorithm.complexity,
    };
  });
}
