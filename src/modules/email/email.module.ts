import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailTemplatesService } from './email-templates.service';

@Global()
@Module({
  providers: [EmailService, EmailTemplatesService],
  exports: [EmailService, EmailTemplatesService],
})
export class EmailModule {}
