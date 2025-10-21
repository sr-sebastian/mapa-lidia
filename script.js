/*
 * script.js - Refactored JS extracted from original HTML.
 * Mejoras:
 * - Selección de nodos con un solo clic/tap tanto en desktop como en mobile.
 * - Mejor feedback visual al seleccionar en dispositivos touch.
 * - Configuración optimizada de interacción para mobile.
 * - Comentarios adicionales para claridad.
 */

(function () {
  // Detectar dispositivo móvil/touch
  const isMobile = (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.userAgent.match(/Android|iPhone|iPad|iPod|Windows Phone/i)
  );
  window.isMobile = isMobile;

  // Reducir DPI para canvas en mobile
  if (isMobile) {
    window.devicePixelRatio = 1;
  }

  // Limitar profundidad de renderizado en mobile
  let degrees = isMobile ? 1 : 2;

  // Opcionalmente desactivar físicas en mobile
  if (isMobile && window.network && window.network.setOptions) {
    window.network.setOptions({ physics: false });
  }

  // Suspender updates/animaciones si la app está en background (mobile friendly)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.network && window.network.setOptions) {
      window.network.setOptions({ physics: false });
    } else if (!document.hidden && window.network && window.network.setOptions) {
      if (!isMobile) window.network.setOptions({ physics: true });
    }
  });

  // Helper: obtener todos los nodos como objeto
  function getAllNodesObj() {
    return nodes.get({ returnType: "Object" });
  }

  // Helper: actualizar todos los nodos de una vez
  function updateAllNodes(allNodes) {
    const updateArray = Object.keys(allNodes).map(id => allNodes[id]);
    nodes.update(updateArray);
  }

  // Helper: restaurar label si estaba oculta
  function restoreLabelIfHidden(node) {
    if (node.hiddenLabel !== undefined) {
      node.label = node.hiddenLabel;
      node.hiddenLabel = undefined;
    }
  }

  // Cache de vecinos conectados (optimización mobile)
  const highlightCache = {};

  // Colores originales por nodo para restaurar
  const nodeColors = {};

  // neighbourhoodHighlight: resalta vecinos y atenúa el resto
  window.neighbourhoodHighlight = function (params) {
    const allNodes = getAllNodesObj();

    if (params.nodes && params.nodes.length > 0) {
      // Activar highlight
      window.highlightActive = true;
      const selectedNode = params.nodes[0];

      // Atenuar todos los nodos y ocultar labels
      for (const nodeId in allNodes) {
        const n = allNodes[nodeId];
        // Guardar color original solo la primera vez
        if (!nodeColors[nodeId]) nodeColors[nodeId] = n.color;
        n.color = "rgba(200,200,200,0.5)";
        if (n.hiddenLabel === undefined) {
          n.hiddenLabel = n.label;
          n.label = undefined;
        }
      }

      // Buscar vecinos conectados (con cache en mobile)
      let allConnected;
      if (isMobile && highlightCache[selectedNode]) {
        allConnected = highlightCache[selectedNode];
      } else {
        const connectedNodes = network.getConnectedNodes(selectedNode) || [];
        allConnected = Array.from(connectedNodes);
        for (let d = 1; d < degrees; d++) {
          const next = [];
          for (const id of allConnected) {
            const con = network.getConnectedNodes(id) || [];
            for (const c of con) next.push(c);
          }
          allConnected = allConnected.concat(next);
        }
        if (isMobile) highlightCache[selectedNode] = allConnected;
      }

      // Atenuar menos los de segundo grado
      for (const id of allConnected) {
        if (allNodes[id]) {
          allNodes[id].color = "rgba(150,150,150,0.75)";
          restoreLabelIfHidden(allNodes[id]);
        }
      }

      // Restaurar color y label a vecinos inmediatos y nodo seleccionado
      const connectedNodes = network.getConnectedNodes(selectedNode) || [];
      for (const id of connectedNodes) {
        if (allNodes[id]) {
          allNodes[id].color = nodeColors[id] || allNodes[id].color;
          restoreLabelIfHidden(allNodes[id]);
        }
      }
      if (allNodes[selectedNode]) {
        // Feedback visual especial para mobile: borde más grueso y color intenso
        if (isMobile) {
          allNodes[selectedNode].color = {
            background: "#ff8800",
            border: "#ff3c00",
            highlight: { background: "#ffd180", border: "#ff3c00" }
          };
        } else {
          allNodes[selectedNode].color = nodeColors[selectedNode] || allNodes[selectedNode].color;
        }
        restoreLabelIfHidden(allNodes[selectedNode]);
      }

      updateAllNodes(allNodes);
    } else if (window.highlightActive === true) {
      // Restaurar colores y labels originales
      const allNodes = getAllNodesObj();
      for (const nodeId in allNodes) {
        const n = allNodes[nodeId];
        n.color = nodeColors[nodeId] || n.color;
        restoreLabelIfHidden(n);
      }
      updateAllNodes(allNodes);
      window.highlightActive = false;
    }
  };

  // -- NUEVO: Selección con un solo clic/tap en cualquier dispositivo --
  // Este código asume que 'network' es el objeto de vis.js ya inicializado.
  // Si usas otra librería, adapta los nombres de eventos.

  if (typeof network !== "undefined" && network && typeof network.on === "function") {
    // Elimina listeners antiguos de click/selectNode para evitar doble ejecución
    network.off("click");
    network.off("selectNode");

    // Listener universal: selecciona nodo con un solo clic o tap
    network.on("selectNode", function(params) {
      window.neighbourhoodHighlight(params);
    });

    // Además, para asegurar máxima compatibilidad touch, también en 'click'
    network.on("click", function(params) {
      if (params.nodes && params.nodes.length > 0) {
        window.neighbourhoodHighlight(params);
      } else {
        // Si se hace click fuera de un nodo, deselecciona
        window.neighbourhoodHighlight({nodes: []});
      }
    });

    // Mejorar interacción para mobile
    if (isMobile) {
      network.setOptions({
        interaction: {
          multiselect: false,
          dragNodes: true,
          dragView: true,
          zoomView: false, // Desactiva zoom accidental por doble tap
          selectable: true,
          selectConnectedEdges: false,
          hover: true
        }
      });
    } else {
      network.setOptions({
        interaction: {
          hover: true
        }
      });
    }
  }

  // Reducir listeners globales en mobile (ejemplo: throttle resize)
  if (isMobile && window.addEventListener) {
    const originalResize = window.onresize;
    let resizeTimeout;
    window.onresize = function (event) {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (typeof originalResize === "function") originalResize(event);
      }, 250); // throttle a 4fps
    };
  }

  // ...resto del código original si existe...
})();
