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
   * @param {import("../Map.js").default} _ The map renderer.
   * @param {import("../../layer/Layer.js").default} layer The layer to be rendererd.
   * @return {MapBoxLayerRenderer} The layer renderer.
   */
  static create(_, layer) {
    return new MapBoxLayerRenderer(/** @type {MapBoxLayer} */ (layer));
  }

  /**
   * Called by the OpenLayer renderer on render if the layer is visible.
   * @param {import('ol/PluggableMap.js').FrameState} frameState
   */
  prepareFrame(frameState) {
    const layer = this.layer;

    // Eventually initialze the MapBox map.
    const map = layer.getMapBoxMap();

    const canvas = map.getCanvas();
    const opacity = layer.getOpacity().toString();
    if (opacity !== canvas.style.opacity) {
      canvas.style.opacity = opacity;
    }

    // Adjust view parameters in mapbox
    const viewState = frameState.viewState;
    const rotation = viewState.rotation || 0;
    map.jumpTo({
      bearing: toDegrees(-rotation),
      center: toLonLat(viewState.center),
      zoom: viewState.zoom - 1,
      animate: false
    });

    this.triggerSynchronousMapboxRendering_(map);
  }

  /**
   * Cancel the scheduled update and trigger a synchronous redraw
   * using some private APIs: this MIGHT BREAK in a future MapBox version!
   * See https://github.com/mapbox/mapbox-gl-js/issues/7893#issue-408992184
   * @param {mapboxgl.Map} map
   */
  triggerSynchronousMapboxRendering_(map) {

    if (map._frame) {
      map._frame.cancel();
      map._frame = null;
    }
    map._render();
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

    this.container_ = options.container;
    this.style_ = options.style;
    this.xyz_ = options.xyz;

    /**
     * @type {mapboxgl.Map}
     */
    this.mapboxMap = null;

    // this.getMapBoxMap();
    this.on('change:visible', evt => {
      this.updateVisibility_();
    });
  }


  /**
   * @override
   */
  getType() {
    return 'VECTOR_TILE';
  }

  getXYZ() {
    this.xyz_;
  }

  /**
   * @return {!mapboxgl.Map} The lazily initialized map
   */
  getMapBoxMap() {
    if (!this.mapboxMap) {
      this.mapboxMap = new mapboxgl.Map({
        container: this.container_,
        style: this.style_,
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
      this.updateVisibility_();
    }
    return this.mapboxMap;
  }

  updateVisibility_() {
    const map = this.getMapBoxMap();
    const visible = this.getVisible();
    const visibility = visible ? 'block' : 'none';
    const canvas = map.getCanvas();
    if (canvas.style.display !== visibility) {
      canvas.style.display = visibility;
    }
  }

  getSourceState() {
    return 'ready';
  }

  /**
   * Change visibility of a sublayer.
   * @param {string} layername
   * @param {boolean} visible
   */
  setLayerVisibility(layername, visible) {
    this.mapboxMap.setLayoutProperty(layername, 'visibility', visible ? 'visible' : 'none');
  }
}
