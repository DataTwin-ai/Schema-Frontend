import { 
  IRequirementsGenerationService, 
  IClassGenerationService, 
  ISchemaGenerationService, 
  IAssistantService,
  IPricingService,
  IAuthService,
  IHistoryService,
  IRequirementHistoryService,
  IClassHistoryService,
  ISchemaHistoryService,
} from './interfaces';
import { ApiRequirementsGenerationService } from './api/ApiRequirementsGenerationService';
import { ApiClassGenerationService } from './api/ApiClassGenerationService';
import { ApiSchemaGenerationService } from './api/ApiSchemaGenerationService';
import { MockAssistantService } from './mock/MockAssistantService';
import { MockPricingService } from './mock/MockPricingService';
import { MockAuthService } from './mock/MockAuthService';
import { MockHistoryService } from './mock/MockHistoryService';
import { MockRequirementHistoryService } from './mock/MockRequirementHistoryService';
import { MockClassHistoryService } from './mock/MockClassHistoryService';
import { MockSchemaHistoryService } from './mock/MockSchemaHistoryService';

export * from './interfaces';
export * from './api/ApiRequirementsGenerationService';
export * from './api/ApiClassGenerationService';
export * from './api/ApiSchemaGenerationService';
export * from './mock/MockAssistantService';
export * from './mock/MockPricingService';
export * from './mock/MockAuthService';
export * from './mock/MockHistoryService';
export * from './mock/MockRequirementHistoryService';
export * from './mock/MockClassHistoryService';
export * from './mock/MockSchemaHistoryService';

// Service factory / registry using Real Backend Services
export const requirementsService: IRequirementsGenerationService = new ApiRequirementsGenerationService();
export const classService: IClassGenerationService = new ApiClassGenerationService();
export const schemaService: ISchemaGenerationService = new ApiSchemaGenerationService();
export const assistantService: IAssistantService = new MockAssistantService();
export const pricingService: IPricingService = new MockPricingService();
export const authService: IAuthService = new MockAuthService();
export const historyService: IHistoryService = new MockHistoryService();
export const requirementHistoryService: IRequirementHistoryService = new MockRequirementHistoryService();
export const classHistoryService: IClassHistoryService = new MockClassHistoryService();
export const schemaHistoryService: ISchemaHistoryService = new MockSchemaHistoryService();

