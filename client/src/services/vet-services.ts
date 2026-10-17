import { mockDelay } from '@/services/mock/delay';
import { mockVetServices } from '@/services/mock/vet-services';
import type { VetService } from '@/types/vet-service';

// Remote vet services. Mock only for now; booking just marks the service as booked.

export const getVetServices = async (): Promise<VetService[]> => mockDelay([...mockVetServices]);
