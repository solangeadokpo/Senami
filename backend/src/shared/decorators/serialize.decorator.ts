import { SetMetadata, type Type } from '@nestjs/common';

export const SERIALIZE_DTO = 'senami:serialize-dto';

/** Only the fields of `dto` marked `@Expose()` leave the server. */
export const Serialize = (dto: Type<unknown>) =>
  SetMetadata(SERIALIZE_DTO, dto);
