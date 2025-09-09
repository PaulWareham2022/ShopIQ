// Mock for react-native-star-rating-widget to avoid test environment issues
const React = require('react');
const { View, Text, TouchableOpacity } = require('react-native');

// Mock StarRating component
const StarRating = ({
  rating = 0,
  onChange = () => {},
  maxStars = 5,
  starSize = 20,
  color = '#FFD700',
  emptyColor = '#E0E0E0',
  enableHalfStar: _enableHalfStar = false,
  enableSwiping: _enableSwiping = false,
  starStyle = {},
  testID,
  ...props
}) => {
  const stars = [];
  
  for (let i = 1; i <= maxStars; i++) {
    const isFilled = i <= rating;
    const starColor = isFilled ? color : emptyColor;
    
    stars.push(
      React.createElement(TouchableOpacity, {
        key: i,
        onPress: () => onChange(i),
        style: [starStyle, { marginHorizontal: 2 }],
        testID: testID ? `${testID}-star-${i}` : undefined,
      }, 
        React.createElement(Text, {
          style: { 
            fontSize: starSize, 
            color: starColor,
            lineHeight: starSize,
          }
        }, '★')
      )
    );
  }
  
  return React.createElement(View, {
    style: { flexDirection: 'row', alignItems: 'center' },
    testID: testID,
    ...props
  }, ...stars);
};

// eslint-disable-next-line no-undef
module.exports = StarRating;
// eslint-disable-next-line no-undef
module.exports.default = StarRating;
