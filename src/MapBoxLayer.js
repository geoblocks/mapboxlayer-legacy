import Layer from 'ol/layer/Layer'
import {toDegrees} from 'ol/math';
import {toLonLat} from 'ol/proj.js';

import mapboxgl from 'mapbox-gl';
import Observable from 'ol/Observable';


export class MapBoxLayerRenderer extends Observable {

  /**
   * @param {MapBoxLayer} layer
   */
  constructor(layer) {
    super();
    this.layer = layer;
  }

  /**
   * Determine if this renderer handles the provided layer.
   * @param {import("ol/layer/Layer.js").default} layer The candidate layer.
   * @return {boolean} The renderer can render the layer.
   */
  static handles(layer) {
    return layer instanceof MapBoxLayer;
  }

  /**
   * Create a layer renderer.
   * @param {import("../Map.js").default} mapRenderer The map renderer.
   * @param {import("../../layer/Layer.js").default} layer The layer to be rendererd.
   * @return {CanvasImageLayerRenderer} The layer renderer.
   */
  static create(mapRenderer, layer) {
    return new MapBoxLayerRenderer(/** @type {MapBoxLayer} */ (layer));
  }

  /**
   * @param {import('ol/PluggableMap.js').FrameState} frameState
   */
  prepareFrame(frameState) {
    const layer = this.layer;
    const mapboxMap = this.layer.mapboxMap;
    const canvas = mapboxMap.getCanvas();
    const viewState = frameState.viewState;

    const visible = layer.getVisible();
    canvas.style.display = visible ? 'block' : 'none';

    const opacity = layer.getOpacity().toString();
    if (opacity !== canvas.style.opacity) {
      canvas.style.opacity = opacity;
    }

    // adjust view parameters in mapbox
    const rotation = viewState.rotation;
    if (rotation) {
      mapboxMap.rotateTo(toDegrees(-rotation), {
        animate: false
      });
    }
    mapboxMap.jumpTo({
      center: toLonLat(viewState.center),
      zoom: viewState.zoom - 1,
      animate: false
    });

    // cancel the scheduled update & trigger synchronous redraw
    // see https://github.com/mapbox/mapbox-gl-js/issues/7893#issue-408992184
    // NOTE: THIS MIGHT BREAK WHEN UPDATING MAPBOX
    if (mapboxMap._frame) {
      mapboxMap._frame.cancel();
      mapboxMap._frame = null;
    }
    mapboxMap._render();

    return false; // never call compose
  }
}

export default class MapBoxLayer extends Layer {

  constructor(options) {

    const baseOptions = Object.assign({}, options);

    delete baseOptions.accessToken;
    delete baseOptions.style;
    delete baseOptions.container;
    super(baseOptions);

    if (options.accessToken) {
      mapboxgl.accessToken = options.accessToken;
    }

    this.mapboxMap = new mapboxgl.Map({
      container: options.container,
      style: options.style,
      attributionControl: false,
      boxZoom: false,
      doubleClickZoom: false,
      dragPan: false,
      dragRotate: false,
      interactive: false,
      keyboard: false,
      pitchWithRotate: false,
      scrollZoom: false,
      touchZoomRotate: false
    });
  }

  getSourceState() {
    return 'ready';
  }

  /**
   * @param {string} name
   * @param {boolean} visible
   */
  setLayerVisibility(name, visible) {
    this.mapboxMap.setLayoutProperty(name, 'visibility', visible ? 'visible' : 'none');
  }
}
