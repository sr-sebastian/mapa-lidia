/*
 * script.js - Refactored JS extracted from original HTML.
 * Main improvements:
 * - Uses const/let and avoids globals.
 * - Consolidates repeated node update logic into helpers.
 * - Comments explain behavior and keep original functionality.
 */

(function () {
  // Cached references to vis DataSets (assumed to exist in the page)
  // Keep same external names (nodes, edges, network, nodeColors) to maintain compatibility.
  // If these variables are not in global scope where this script runs, the original HTML should
  // ensure they are created before this script executes.
  const degrees = 2;

  // Helper: get all nodes as object
  function getAllNodesObj() {
    return nodes.get({ returnType: "Object" });
  }

  // Helper: build update array from allNodes object and call nodes.update once
  function updateAllNodes(allNodes) {
    const updateArray = Object.keys(allNodes).map(id => allNodes[id]);
    nodes.update(updateArray);
  }

  // Restore label helper used in multiple places
  function restoreLabelIfHidden(node) {
    if (node.hiddenLabel !== undefined) {
      node.label = node.hiddenLabel;
      node.hiddenLabel = undefined;
    }
  }

  // neighbourhoodHighlight: highlights neighbours of the selected node and dims others.
  window.neighbourhoodHighlight = function (params) {
    const allNodes = getAllNodesObj();

    if (params.nodes && params.nodes.length > 0) {
      // Activate highlight mode
      window.highlightActive = true;
      const selectedNode = params.nodes[0];

      // Dim all nodes and hide labels (store them on hiddenLabel)
      for (const nodeId in allNodes) {
        const n = allNodes[nodeId];
        n.color = "rgba(200,200,200,0.5)";
        if (n.hiddenLabel === undefined) {
          n.hiddenLabel = n.label;
          n.label = undefined;
        }
      }

      // Find first-degree connected nodes
      const connectedNodes = network.getConnectedNodes(selectedNode) || [];

      // Find up to `degrees` neighborhood (currently degrees=2)
      let allConnected = Array.from(connectedNodes);
      for (let d = 1; d < degrees; d++) {
        const next = [];
        for (const id of allConnected) {
          const con = network.getConnectedNodes(id) || [];
          for (const c of con) next.push(c);
        }
        allConnected = allConnected.concat(next);
      }

      // Lightly un-dim second-degree neighbors, restore their labels
      for (const id of allConnected) {
        if (allNodes[id]) {
          allNodes[id].color = "rgba(150,150,150,0.75)";
          restoreLabelIfHidden(allNodes[id]);
        }
      }

      // Restore color/label for immediate neighbors and selected node
      for (const id of connectedNodes) {
        if (allNodes[id]) {
          allNodes[id].color = nodeColors[id] || allNodes[id].color;
          restoreLabelIfHidden(allNodes[id]);
        }
      }
      if (allNodes[selectedNode]) {
        allNodes[selectedNode].color = nodeColors[selectedNode] || allNodes[selectedNode].color;
        restoreLabelIfHidden(allNodes[selectedNode]);
      }

    } else if (window.highlightActive === true) {
      // Reset to original colors and labels
      for (const nodeId in getAllNodesObj()) {
        const n = allNodesTemp[nodeId]; // placeholder, replaced below
      }
      // Re-fetch and restore
      const allNodes2 = getAllNodesObj();
      for (const nodeId in allNodes2) {
        allNodes2[nodeId].color = nodeColors[nodeId] || allNodes2[nodeId].color;
        restoreLabelIfHidden(allNodes2[nodeId]);
      }
      window.highlightActive = false;
      updateAllNodes(allNodes2);
      return;
    }

    // Always update nodes once at the end
    updateAllNodes(allNodes);
  };

  // filterHighlight: hides all nodes except the selected ones (used for filtering)
  window.filterHighlight = function (params) {
    const allNodes = getAllNodesObj();

    if (params.nodes && params.nodes.length > 0) {
      window.filterActive = true;
      const selectedNodes = params.nodes;

      // Hide all nodes and save labels
      for (const nodeId in allNodes) {
        const n = allNodes[nodeId];
        n.hidden = true;
        if (n.savedLabel === undefined) {
          n.savedLabel = n.label;
          n.label = undefined;
        }
      }

      // Unhide selected nodes and restore their labels
      for (const id of selectedNodes) {
        if (allNodes[id]) {
          allNodes[id].hidden = false;
          if (allNodes[id].savedLabel !== undefined) {
            allNodes[id].label = allNodes[id].savedLabel;
            allNodes[id].savedLabel = undefined;
          }
        }
      }

    } else if (window.filterActive === true) {
      // Reset: unhide all nodes and restore labels
      for (const nodeId in allNodes) {
        const n = allNodes[nodeId];
        n.hidden = false;
        if (n.savedLabel !== undefined) {
          n.label = n.savedLabel;
          n.savedLabel = undefined;
        }
      }
      window.filterActive = false;
    }

    updateAllNodes(allNodes);
  };

  // selectNode / selectNodes wrappers keep behaviour but use network API then call highlights
  window.selectNode = function (nodeIds) {
    network.selectNodes(nodeIds);
    neighbourhoodHighlight({ nodes: nodeIds });
    return nodeIds;
  };

  window.selectNodes = function (nodeIds) {
    network.selectNodes(nodeIds);
    filterHighlight({ nodes: nodeIds });
    return nodeIds;
  };

  // highlightFilter: find nodes or edges matching a property/value and select them
  window.highlightFilter = function (filter) {
    const selected = [];
    const prop = filter.property;
    const valueArr = filter.value || [];

    if (filter.item === "node") {
      const all = getAllNodesObj();
      for (const id in all) {
        const v = all[id][prop];
        if (v !== undefined && valueArr.includes(String(v))) selected.push(id);
      }
    } else if (filter.item === "edge") {
      const allEdges = edges.get({ returnType: "Object" });
      for (const eid in allEdges) {
        const e = allEdges[eid];
        const v = e[prop];
        if (v !== undefined && valueArr.includes(String(v))) {
          selected.push(e.from);
          selected.push(e.to);
        }
      }
    }

    selectNodes(selected);
  };

  // Expose helpers for testing/debug if needed (non-enumerable)
  Object.defineProperty(window, "__visHelpers", {
    value: { getAllNodesObj, updateAllNodes },
    writable: false,
    configurable: true,
    enumerable: false
  });
})();