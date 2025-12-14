import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { KeycloakAuthGuard, AuthenticatedUser } from '../../common/guards/keycloak-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditCreate, AuditDelete, AuditDownload } from '../../common/decorators/audit.decorator';

@ApiTags('documents')
@ApiBearerAuth('access-token')
@UseGuards(KeycloakAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('contract/:contractId')
  @ApiOperation({ summary: 'Get all documents for a contract' })
  @ApiParam({ name: 'contractId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Documents list returned' })
  async findByContract(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.findByContract(contractId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document metadata by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Document metadata returned' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.findOne(id, user);
  }

  @Get(':id/download')
  @AuditDownload('Document')
  @ApiOperation({ summary: 'Download document file' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'File download started' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { stream, document } = await this.documentsService.download(id, user);

    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(document.originalName)}"`,
      'Content-Length': document.size,
    });

    stream.pipe(res);
  }

  @Post('upload')
  @AuditCreate('Document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document to a contract' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'contractId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        contractId: {
          type: 'string',
          format: 'uuid',
        },
        isMainDocument: {
          type: 'boolean',
          default: false,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file or missing contract' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('contractId', ParseUUIDPipe) contractId: string,
    @Query('isMainDocument') isMainDocument: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.documentsService.upload(
      file,
      contractId,
      isMainDocument === 'true',
      user,
    );
  }

  @Delete(':id')
  @AuditDelete('Document')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Document deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.documentsService.remove(id, user);
  }
}
