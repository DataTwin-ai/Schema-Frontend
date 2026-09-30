import { IPricingService } from '../interfaces';
import { BusinessInput, GenerationCost, RequirementsModel, SchemaClass, SchemaModel } from '../../types';

export class MockPricingService implements IPricingService {
  async getEstimatedCost(context?: {
    businessInput?: BusinessInput;
    requirements?: RequirementsModel;
    classes?: SchemaClass[];
    schema?: SchemaModel;
  }): Promise<GenerationCost> {
    const isGenerated = Boolean(
      context?.businessInput?.isBusinessRequirementGenerated ||
      context?.businessInput?.generatedBusinessRequirement ||
      context?.requirements ||
      context?.classes ||
      context?.schema
    );

    if (!isGenerated) {
      return {
        amount: 0,
        currency: 'INR',
        currencySymbol: '\u20B9',
        formattedAmount: '\u2014',
        isEstimate: true,
        source: 'DataTwin Standard Tier SCDP Pricing',
        lastUpdated: new Date().toISOString(),
      };
    }

    // Dynamically calculate based on model size or default to base tier
    let baseAmount = 25.12;

    if (context?.classes && context.classes.length > 0) {
      baseAmount = Number((25.12 + (context.classes.length - 11) * 1.5).toFixed(2));
      if (baseAmount < 25.12) baseAmount = 25.12;
    }

    return {
      amount: baseAmount,
      currency: 'INR',
      currencySymbol: '\u20B9',
      formattedAmount: `\u20B9${baseAmount.toFixed(2)}`,
      isEstimate: true,
      source: 'DataTwin Standard Tier SCDP Pricing',
      lastUpdated: new Date().toISOString(),
    };
  }
}
