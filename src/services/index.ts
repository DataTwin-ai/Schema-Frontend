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
import { ApiClassHistoryService } from './api/ApiClassHistoryService';
import { ApiSchemaHistoryService } from './api/ApiSchemaHistoryService';

export * from './interfaces';
export * from './api/ApiRequirementsGenerationService';
export * from './api/ApiClassGenerationService';
export * from './api/ApiSchemaGenerationService';
export * from './mock/MockAssistantService';
export * from './mock/MockPricingService';
export * from './mock/MockAuthService';
export * from './mock/MockHistoryService';
export * from './mock/MockRequirementHistoryService';
export * from './api/ApiClassHistoryService';
export * from './api/ApiSchemaHistoryService';

// Service factory / registry using Real Backend Services
export const requirementsService: IRequirementsGenerationService = new ApiRequirementsGenerationService();
export const classService: IClassGenerationService = new ApiClassGenerationService();
export const schemaService: ISchemaGenerationService = new ApiSchemaGenerationService();
import { ApiAssistantService } from './api/ApiAssistantService';
export const assistantService: IAssistantService = new ApiAssistantService();
export const pricingService: IPricingService = new MockPricingService();
export const authService: IAuthService = new MockAuthService();
export const historyService: IHistoryService = new MockHistoryService();
export const requirementHistoryService: IRequirementHistoryService = new MockRequirementHistoryService();
export const classHistoryService: IClassHistoryService = new ApiClassHistoryService();
export const schemaHistoryService: ISchemaHistoryService = new ApiSchemaHistoryService();


export * from './api/ApiSchemaStudioService';
