import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { 
  StarRatingComponent, 
  SupplierRating, 
  QualityRating, 
  StarRatingDisplay, 
  StarRatingInput 
} from './StarRating';
import { colors } from '../../constants/colors';

/**
 * Example component demonstrating the StarRating components
 * This file can be used for development/testing purposes
 */
export const StarRatingExample: React.FC = () => {
  const [supplierRating, setSupplierRating] = useState(3);
  const [qualityRating, setQualityRating] = useState(4);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Star Rating Components</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Star Rating</Text>
        <StarRatingComponent rating={3.5} testID="basic-rating" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supplier Rating (Orange)</Text>
        <SupplierRating rating={supplierRating} testID="supplier-rating" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quality Rating (Green)</Text>
        <QualityRating rating={qualityRating} testID="quality-rating" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interactive Supplier Rating</Text>
        <StarRatingInput
          rating={supplierRating}
          onRatingChange={setSupplierRating}
          testID="interactive-supplier"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interactive Quality Rating</Text>
        <StarRatingInput
          rating={qualityRating}
          onRatingChange={setQualityRating}
          testID="interactive-quality"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display Only (No Rating)</Text>
        <StarRatingDisplay rating={0} testID="no-rating" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Styling</Text>
        <StarRatingComponent
          rating={4}
          starSize={30}
          starColor="#FF6B6B"
          emptyStarColor="#FFE0E0"
          showRatingNumber={false}
          testID="custom-styling"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Large Stars</Text>
        <StarRatingComponent
          rating={2.5}
          starSize={40}
          testID="large-stars"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 15,
  },
});

export default StarRatingExample;
