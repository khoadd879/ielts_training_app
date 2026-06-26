import { PartialType } from '@nestjs/swagger';
import { CreateSubscriptionPackageDto } from './create-subscription-package.dto';

export class UpdateSubscriptionPackageDto extends PartialType(CreateSubscriptionPackageDto) {}
