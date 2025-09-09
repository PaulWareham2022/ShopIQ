// Mock for react-native-svg to avoid test environment issues
const React = require('react');

// Mock SVG components
const Svg = (props) => React.createElement('Svg', props);
const Path = (props) => React.createElement('Path', props);
const Circle = (props) => React.createElement('Circle', props);
const Rect = (props) => React.createElement('Rect', props);
const G = (props) => React.createElement('G', props);
const Defs = (props) => React.createElement('Defs', props);
const ClipPath = (props) => React.createElement('ClipPath', props);
const LinearGradient = (props) => React.createElement('LinearGradient', props);
const Stop = (props) => React.createElement('Stop', props);
const RadialGradient = (props) => React.createElement('RadialGradient', props);
const Mask = (props) => React.createElement('Mask', props);
const Pattern = (props) => React.createElement('Pattern', props);
const Image = (props) => React.createElement('Image', props);
const Text = (props) => React.createElement('Text', props);
const TSpan = (props) => React.createElement('TSpan', props);
const TextPath = (props) => React.createElement('TextPath', props);
const Use = (props) => React.createElement('Use', props);
const Symbol = (props) => React.createElement('Symbol', props);
const Marker = (props) => React.createElement('Marker', props);
const Polygon = (props) => React.createElement('Polygon', props);
const Polyline = (props) => React.createElement('Polyline', props);
const Line = (props) => React.createElement('Line', props);
const Ellipse = (props) => React.createElement('Ellipse', props);

// Mock Touchable components
const Touchable = {
  Mixin: {
    touchableGetInitialState: () => ({}),
    touchableHandleStartShouldSetResponder: () => false,
    touchableHandleResponderGrant: () => {},
    touchableHandleResponderMove: () => {},
    touchableHandleResponderRelease: () => {},
    touchableHandleResponderTerminate: () => {},
    touchableHandleResponderTerminationRequest: () => true,
  },
};

module.exports = {
  Svg,
  Path,
  Circle,
  Rect,
  G,
  Defs,
  ClipPath,
  LinearGradient,
  Stop,
  RadialGradient,
  Mask,
  Pattern,
  Image,
  Text,
  TSpan,
  TextPath,
  Use,
  Symbol,
  Marker,
  Polygon,
  Polyline,
  Line,
  Ellipse,
  Touchable,
  // Export default
  default: Svg,
};
