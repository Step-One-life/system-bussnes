# Архитектура проекта

Документ описывает архитектуру, паттерны и конвенции NestJS-бэкенда. Предназначен для трансляции единого подхода на другие проекты.

---

## 1. Стек технологий

| Компонент | Технология | Зачем |
|-----------|----------|-------|
| Фреймворк | NestJS | Модульная архитектура, DI, декораторы |
| HTTP | Fastify (не Express) | Производительность, нативная поддержка multipart |
| ORM | Sequelize 6 + sequelize-typescript | Декларативные модели, миграции |
| Валидация | class-validator + class-transformer | DTO-валидация через декораторы |
| Документация | @nestjs/swagger | Автогенерация из DTO |
| Аутентификация | Passport + JWT | Bearer-токены, refresh-токены |
| Логи | Pino (nestjs-pino) | Структурированные JSON-логи, совместимость с Fastify |
| Даты | Luxon | Иммутабельные, таймзоны, форматирование |
| Утилиты | Lodash | Коллекции, omit/pick, size |
| Файлы | @fastify/multipart + @fastify/static | Загрузка, раздача |
| Хранилище | Local FS / S3 (MinIO) | Конфигурируется через env |

---

## 2. Структура проекта

```
project-root/
├── src/
│   ├── main.ts                    # Bootstrap: Fastify, pipes, CORS, Swagger
│   ├── app.module.ts              # Корневой модуль, все импорты
│   ├── common/                    # Общий код (shared)
│   │   ├── decorators/            # @CurrentUser(), @Roles(), @TransformBoolean()
│   │   ├── dto/                   # PaginationDto, PaginatedResponseDto
│   │   ├── enums/                 # UserType и другие
│   │   ├── guards/                # JwtAuthGuard, RolesGuard
│   │   ├── interfaces/            # CurrentUserPayload
│   │   ├── models/                # Translation DTO
│   │   ├── modules/               # Глобальные модули (Translation, Encryption)
│   │   ├── services/              # FileService, EncryptionService, TranslationHelperService
│   │   ├── strategies/            # JwtStrategy (Passport)
│   │   └── utils/                 # DateUtil (Luxon), query-filters
│   ├── config/                    # database.config.ts, sequelize-cli.config.js
│   ├── commands/                  # CLI-команды (encrypt, migrate)
│   └── modules/                   # Фича-модули
│       ├── auth/
│       ├── user/
│       ├── gender/                # Пример простого модуля
│       ├── age/                   # Пример модуля с переводами
│       ├── contest/               # Пример сложного модуля с вложенными
│       │   └── modules/
│       │       ├── contest-discipline/
│       │       ├── contest-age/
│       │       └── ...
│       └── ...
├── database/
│   └── migrations/                # Sequelize-миграции (TypeScript)
├── docker/
│   ├── mysql/init/                # Начальные SQL-скрипты
│   └── nginx/                     # Конфиг nginx
├── plan/                          # Документация задач
│   └── default-swagger.md         # Конвенция Swagger
├── tsconfig.json                  # Основной TS-конфиг
├── tsconfig.build.json            # Для nest build
├── tsconfig.migrations.json       # Для компиляции миграций
├── .sequelizerc                   # Пути для sequelize-cli
├── nest-cli.json                  # NestJS CLI + assets (hbs-шаблоны)
├── eslint.config.mjs              # Flat ESLint config
├── .prettierrc                    # singleQuote, trailingComma: all
├── Dockerfile                     # Multi-stage build (node:22-alpine)
├── docker-compose.yml             # db + backend + migrate
├── Makefile                       # deploy, logs, status, migrate
└── CLAUDE.md                      # Инструкции для Claude Code
```

---

## 3. Модули — структура и нейминг

### 3.1 Структура модуля

Каждый фича-модуль — самодостаточная папка:

```
module-name/
├── module-name.module.ts          # Регистрация: imports, controllers, providers, exports
├── module-name.controller.ts      # REST-эндпоинты (см. правило ниже)
├── module-name.service.ts         # Бизнес-логика
├── entities/
│   ├── module-name.entity.ts      # Sequelize-модель
│   └── module-name-translation.entity.ts  # (опционально, для i18n)
├── dto/
│   ├── index.ts                   # Реэкспорт всех DTO
│   ├── create-module-name-request.dto.ts
│   ├── create-module-name-response.dto.ts
│   ├── update-module-name-request.dto.ts
│   ├── update-module-name-response.dto.ts
│   ├── get-module-name-response.dto.ts
│   ├── get-all-module-names-response.dto.ts
│   ├── base-module-name-response.dto.ts   # Общие поля ответа
│   └── query-module-name.dto.ts           # (если свои фильтры)
└── swagger/
    ├── index.ts                          # Реэкспорт всех декораторов (export * from './каждый-файл')
    ├── api-create-module-name.swagger.ts # Один декоратор — один файл
    ├── api-update-module-name.swagger.ts
    ├── api-get-module-name.swagger.ts
    ├── api-get-all-module-names.swagger.ts
    ├── api-delete-module-name.swagger.ts
    └── ...                               # По файлу на каждую функцию ApiVerbEntity
```

**Правило (plan-025):** swagger-декораторы НЕ собираются в один `module-name.swagger.ts`.
Каждый `applyDecorators()`-блок — это отдельный файл с именем
`api-<verb>-<entity>[-<action>].swagger.ts` (kebab-case, экспортирует
ровно одну функцию `ApiVerbEntity()`), по аналогии с `dto/` (один DTO — один файл).
`swagger/index.ts` реэкспортирует все декораторы. Импорт в контроллере не меняется:
`import { ApiCreateEntity } from './swagger'`.

**Размещение контроллеров (plan-026):**

- **Один контроллер на модуль** — лежит в корне модуля как `<module-name>.controller.ts`. **Папку `controllers/` не создаём.**
- **Несколько контроллеров на модуль** (например `applications.controller.ts` + `contest-command.controller.ts` в `contest-command/`, или `athletes.controller.ts` + `persons.controller.ts` в `person/`) — все лежат в корне модуля рядом. Подпапку `controllers/` тоже не создаём — это разумно только если контроллеров реально много (>5) и они логически группируются, чего в этом проекте нет.

То же правило для `<module-name>.service.ts` — один сервис лежит в корне, несколько мелких — рядом. Если у модуля действительно много сервисов (как в `contest-command/services/`), допустима папка `services/`.

### 3.2 Нейминг

| Что | Паттерн | Пример |
|-----|---------|--------|
| Папка модуля | `kebab-case` | `contest-command/` |
| Файлы | `kebab-case.type.ts` | `contest-command.service.ts` |
| Класс модуля | `PascalCase + Module` | `ContestCommandModule` |
| Класс сервиса | `PascalCase + Service` | `ContestCommandService` |
| Класс контроллера | `PascalCase + Controller` | `ContestCommandController` |
| Entity | `PascalCase` | `ContestCommand` |
| Таблица БД | `snake_case` множественное | `contest_commands` |
| DTO request | `Create/UpdateEntityRequestDto` | `CreateGenderRequestDto` |
| DTO response | `Create/Get/GetAllEntityResponseDto` | `GetAllGendersResponseDto` |
| Swagger | `ApiVerbEntity()` | `ApiCreateGender()`, `ApiGetAllGenders()` |
| Контроллер route | `kebab-case` множественное | `@Controller('contest-commands')` |
| API tag | `kebab-case` множественное | `@ApiTags('contest-commands')` |

### 3.3 Границы модулей (plan-026)

Модуль владеет своими сущностями. Доступ из другого модуля — через сервис, не через ORM.

**Можно:**
- Импортировать `FooEntity` из `@modules/foo/entities/foo.entity` **только для FK-relations**: `@BelongsTo(() => Foo)`, `@HasMany(() => Foo)`. Sequelize требует ссылку на класс для relation-декораторов — это легитимно.
- Импортировать `FooService` из `@modules/foo/foo.service` и вызывать его публичные методы.
- Импортировать типы из `@modules/foo/foo.types` (например `BRAND_REQUEST_KEY`, `ResolvedBrand` — типы request-extension, который ставит middleware).

**Нельзя:**
- Делать `@InjectModel(FooEntity)` в сервисе модуля A, если `FooEntity` принадлежит модулю B. Это нарушает encapsulation — модуль А делает SELECT/UPDATE напрямую в чужую таблицу. Правильно: делегировать `FooService.find()` / `FooService.update()`.
- Дублировать в сервисе А SQL-запросы по таблице `foo_*` ради «производительности» — если действительно нужен batch-доступ, экспонируется `FooService.findByIds(ids: number[])` или подобный публичный метод.
- Импортировать private helpers / internals чужого модуля (всё что не реэкспортировано через `module/index.ts` или `module/<name>.types.ts`).

Известные нарушения, под рефакторинг: см. plan-026 Wave 5 (Auth не должен держать User+Trainer entities) и Wave 6 (External + ContestDownload — read-only фасады с прямым `InjectModel` чужих сущностей).

### 3.4 Вложенные модули

Для подсущностей — вложенная папка `modules/` внутри родителя:

```
contest/
├── contest.module.ts
└── modules/
    ├── contest-discipline/
    ├── contest-age/
    └── contest-command/
        └── modules/
            ├── contest-command-athlete/
            └── contest-command-comment/
```

Вложенные модули импортируются в `app.module.ts` напрямую (flat), не через родительский модуль.

---

## 4. Entities (Sequelize-TypeScript)

### 4.1 Паттерн объявления

```typescript
import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  ForeignKey, BelongsTo, Default,
} from 'sequelize-typescript';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Table({ tableName: 'table_name', timestamps: false })
export class EntityName extends Model<EntityName> {
  @ApiProperty({ example: 1, description: 'ID' })
  @PrimaryKey
  @AutoIncrement
  @Column
  declare id: number;

  @ApiProperty({ example: 'value', description: 'Описание' })
  @Column
  declare name: string;

  @ApiPropertyOptional({ example: true, description: 'Активность' })
  @Default(true)
  @Column({ field: 'is_active' })
  declare isActive: boolean;

  @ApiPropertyOptional()
  @Column({ field: 'date_add' })
  declare dateAdd: Date;

  @ApiPropertyOptional()
  @Column({ field: 'date_update' })
  declare dateUpdate: Date;

  // FK
  @ForeignKey(() => OtherEntity)
  @Column({ field: 'other_entity_id' })
  declare otherEntityId: number;

  @BelongsTo(() => OtherEntity)
  declare otherEntity: OtherEntity;
}
```

### 4.2 Правила

| Правило | Описание |
|---------|----------|
| `timestamps: false` | Всегда. Даты управляются вручную (`dateAdd`, `dateUpdate`) |
| `declare` | Все поля через `declare`, не инициализация |
| `field: 'snake_case'` | Маппинг camelCase → snake_case в БД |
| `@ApiProperty` | На каждом поле — для Swagger |
| Таблица | `snake_case`, множественное число (`genders`, `contest_commands`) |

---

## 5. DTO — структура и конвенции

### 5.1 Нейминг DTO-файлов

```
dto/
├── index.ts                              # export * from './каждый-файл'
├── base-entity-response.dto.ts           # Общие поля ответа
├── create-entity-request.dto.ts          # Тело POST-запроса
├── create-entity-response.dto.ts         # Ответ на POST (extends Base)
├── update-entity-request.dto.ts          # Тело PATCH-запроса
├── update-entity-response.dto.ts         # Ответ на PATCH (extends Base)
├── get-entity-response.dto.ts            # Ответ на GET :id (extends Base)
├── get-all-entities-response.dto.ts      # Ответ на GET list
└── query-entity.dto.ts                   # Query-параметры (extends PaginationDto)
```

### 5.2 Request DTO

```typescript
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateEntityRequestDto {
  @ApiProperty({ example: 'value', description: 'Описание' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: true, description: 'Активность' })
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 1 || value === '1' || value === true || value === 'true') return true;
    if (value === 0 || value === '0' || value === false || value === 'false') return false;
    return value;
  })
  isActive: boolean;
}
```

### 5.3 Domain → DTO mapping (plan-026)

Маппинг доменной модели или entity в response-DTO — обязанность DTO, не контроллера.

**Правильно** — static factory на DTO:
```typescript
// dto/base-entity-response.dto.ts
export class BaseEntityResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  // ...

  static fromEntity(row: Entity): BaseEntityResponseDto {
    return Object.assign(new BaseEntityResponseDto(), {
      id: row.id,
      name: row.name,
      // ...
    });
  }

  // Для домен-объектов (НЕ entity), например `ResolvedBrand`:
  static fromDomain(domain: SomeDomain): BaseEntityResponseDto {
    return Object.assign(new BaseEntityResponseDto(), {
      id: domain.id,
      // ...
    });
  }
}
```

```typescript
// controller — thin
@Get(':id')
async findOne(@Param('id') id: string) {
  const row = await this.service.findOneOrFail(+id);
  return BaseEntityResponseDto.fromEntity(row);
}
```

**Нельзя** — `private toResponseDto(...)` в контроллере. Контроллер не должен знать какие поля попадают в HTTP-ответ.

Альтернатива: сервис сам возвращает DTO (когда join/aggregate под конкретный response — например статистика). В этом случае static factory не нужен.

### 5.4 Base Response DTO

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BaseEntityResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'value' })
  name: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional()
  dateAdd?: Date;

  @ApiPropertyOptional()
  dateUpdate?: Date;
}
```

Create/Update/Get Response наследуют Base:

```typescript
export class CreateEntityResponseDto extends BaseEntityResponseDto {}
```

### 5.5 GetAll Response DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityResponseDto } from './base-entity-response.dto';

export class GetAllEntitiesResponseDto {
  @ApiProperty({ type: [BaseEntityResponseDto] })
  items: BaseEntityResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  pageSize: number;
}
```

### 5.6 Query DTO

Для модулей с кастомными фильтрами — наследует `PaginationDto`:

```typescript
import { PaginationDto } from '@/common/dto/pagination.dto';

export class QueryEntityDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  typeUser?: number;
}
```

### 5.7 Общая пагинация (PaginationDto)

```typescript
export class PaginationDto {
  page?: number = 1;          // Номер страницы
  pageSize?: number = 10;     // Записей на страницу
  sortField?: string;         // Поле сортировки
  sortOrder?: 'asc' | 'desc'; // Направление
  search?: string;            // Полнотекстовый поиск
  lang?: string = 'ru';       // Язык переводов
}
```

---

## 6. Swagger — композитные декораторы

### 6.1 Принцип

Swagger-декораторы НЕ пишутся в контроллере inline. Вместо этого — отдельная папка `swagger/` с функциями-декораторами.

**Один декоратор — один файл** (plan-025). НЕ собираем все `Api*`-функции
в общий `module-name.swagger.ts`: по аналогии с `dto/` (один DTO — один файл)
каждый `applyDecorators()`-блок живёт в своём `api-<verb>-<entity>.swagger.ts`.
Это упрощает диффы, поиск и параллельную работу над разными эндпоинтами.

### 6.2 Файлы папки `swagger/`

```
swagger/
├── index.ts                          # export * from './каждый-файл'
├── api-create-entity.swagger.ts      # ApiCreateEntity()
├── api-update-entity.swagger.ts      # ApiUpdateEntity()
├── api-get-entity.swagger.ts         # ApiGetEntity()
├── api-get-all-entities.swagger.ts   # ApiGetAllEntities()
└── api-delete-entity.swagger.ts      # ApiDeleteEntity()
```

Каждый файл — один `export function ApiVerbEntity() { return applyDecorators(...) }`:

```typescript
// swagger/api-create-entity.swagger.ts
import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateEntityResponseDto } from '../dto';

export function ApiCreateEntity() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create entity' }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Entity created',
      type: CreateEntityResponseDto, // Всегда DTO, не inline schema
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Validation error',
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized',
    }),
  );
}
```

```typescript
// swagger/index.ts
export * from './api-create-entity.swagger';
export * from './api-update-entity.swagger';
export * from './api-get-entity.swagger';
export * from './api-get-all-entities.swagger';
export * from './api-delete-entity.swagger';
```

### 6.3 Нейминг функций

```
Api + HTTP-глагол + Сущность [+ Действие]
```

| Функция | Эндпоинт |
|---------|----------|
| `ApiCreateGender()` | POST |
| `ApiGetAllGenders()` | GET list |
| `ApiGetGender()` | GET :id |
| `ApiUpdateGender()` | PATCH :id |
| `ApiDeleteGender()` | DELETE :id |
| `ApiCopyContest()` | POST :id/copy |

### 6.4 Использование в контроллере

```typescript
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.ADMIN)
@ApiCreateGender()               // <-- один декоратор вместо 5
create(@Body() dto: CreateGenderRequestDto) {
  return this.service.create(dto);
}
```

### 6.5 Обязательные элементы

1. `ApiOperation` с `summary` — всегда
2. `ApiResponse` (success) с `type: DTO` — всегда
3. `ApiResponse` (ошибки: 400, 401, 403, 404) — по ситуации
4. `ApiBearerAuth()` — если защищённый эндпоинт
5. Response type — **только DTO-классы**, никогда inline `schema`

---

## 7. Контроллер — Thin Controller pattern (plan-026)

### 7.1 Принцип

Контроллер делает ровно три вещи:

1. **Принимает параметры** через декораторы — `@Param`, `@Body`, `@Query`, `@CurrentUser`, `@Req`.
2. **Делегирует** одному вызову сервиса.
3. **Возвращает** результат либо как есть, либо через DTO-factory (`Dto.fromDomain(x)` / `Dto.fromEntity(x)`).

### 7.2 Чек-лист (что контроллер НЕ делает)

| Анти-паттерн | Куда выносится |
|---|---|
| `private assertFoo(req)` — проверка brand-flag / роли | `@RequireBrandFlag(flag)` декоратор + `BrandFlagGuard` (или `RolesGuard`) |
| `if (!result) throw new NotFoundException()` после `service.find()` | `service.findOneOrFail()` сам бросает `NotFoundException` |
| `private toDto(row)` — domain/entity → response DTO | `Dto.fromEntity(row)` / `Dto.fromDomain(domain)` static factory |
| `private parseFilter(query)` — query-string → domain filter | `QueryDto` с `class-transformer` декораторами (`@Type`, `@Transform`) |
| inline `_.includes(Object.values(SomeEnum), value)` | `@Param('x', new ParseEnumPipe(SomeEnum))` |
| inline `await (req as any).file()` + `toBuffer()` | helper в `@/common/utils/multipart.util.ts` |
| inline `if (!file.exists) throw NotFound('… missing on storage')` | сервис файлов сам делает 404: `FileStorageService.openX(id)` |
| Бизнес-валидация полей DTO (cross-field) | сервис — первая строка метода |

Контроллер НЕ ИМПОРТИРУЕТ: `NotFoundException`, `BadRequestException`, `ForbiddenException` (кроме случаев когда это часть инфраструктурного guard'а, который контроллер декорирует).

### 7.3 Пример (thin)

```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserType } from '@/common/enums/user-type.enum';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { EntityService } from './entity.service';
import { CreateEntityRequestDto, GetAllEntitiesResponseDto } from './dto';
import { ApiCreateEntity, ApiGetAllEntities, ApiGetEntity, ApiUpdateEntity, ApiDeleteEntity } from './swagger';

@ApiTags('entities')
@Controller('entities')
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiCreateEntity()
  create(@Body() dto: CreateEntityRequestDto) {
    return this.entityService.create(dto);
  }

  @Get()
  @ApiGetAllEntities()
  findAll(@Query() query: PaginationDto): Promise<GetAllEntitiesResponseDto> {
    return this.entityService.findAll(query);
  }

  @Get(':id')
  @ApiGetEntity()
  findOne(@Param('id') id: string) {
    return this.entityService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiUpdateEntity()
  update(@Param('id') id: string, @Body() dto: UpdateEntityRequestDto) {
    return this.entityService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiDeleteEntity()
  remove(@Param('id') id: string) {
    return this.entityService.remove(+id);
  }
}
```

### 7.4 Антипример (что НЕ делать)

```typescript
// ❌ ПЛОХО — контроллер содержит бизнес-логику
@Get(':id/document-scan')
async getDocumentScan(
  @Param('id') id: string,
  @CurrentUser() user: CurrentUserPayload,
  @Res({ passthrough: false }) reply: any,
) {
  const personId = Number(id);
  const person = await this.personService.findOne(personId, user.userId);
  if (!person) {
    throw new NotFoundException('Person not found');           // ← service work
  }
  if (!person.documentScan) {
    throw new NotFoundException('Document scan not uploaded'); // ← service work
  }
  const exists = await this.fileStorage.exists(person.documentScan);
  if (!exists) {
    throw new NotFoundException('Document scan file missing'); // ← service work
  }
  return reply.send(await this.fileStorage.read(person.documentScan));
}
```

```typescript
// ✅ ХОРОШО — контроллер thin
@Get(':id/document-scan')
@RequireBrandFlag('requireIdentityDocument')
async getDocumentScan(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser() user: CurrentUserPayload,
  @Res({ passthrough: false }) reply: any,
) {
  const stream = await this.fileStorage.openDocumentScan(id, user.userId);
  return reply.send(stream);
}
```

Все три `NotFoundException` живут в `FileStorageService.openDocumentScan` (или в `PersonService.findOneOrFail`). Контроллер просто стримит результат.

### 7.5 Что контроллер ИМЕЕТ право делать

- `@UseGuards(...)`, `@Roles(...)`, `@RequireBrandFlag(...)` — декоративная композиция guard'ов.
- `@Res({ passthrough: false }) reply` — нативный fastify-доступ для стриминга бинарных файлов. Это не «бизнес-логика», это сериализация ответа.
- Минимальное преобразование параметров: `ParseIntPipe`, `ParseEnumPipe`, `ParseUUIDPipe`. Контроллер передаёт уже корректный тип в сервис.

---

## 8. Сервис — паттерн

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { DateUtil } from '@common/utils';
import { PaginatedResponseDto } from '@/common/dto/paginated-response.dto';
import * as _ from 'lodash';

@Injectable()
export class EntityService {
  private readonly allowedSortFields = ['id', 'name', 'date_add'];

  constructor(
    @InjectModel(Entity) private readonly entityModel: typeof Entity,
  ) {}

  async create(dto: CreateEntityRequestDto): Promise<Entity> {
    return this.entityModel.create({
      ...dto,
      dateAdd: DateUtil.now(),
    } as any);
  }

  async findAll(query: PaginationDto): Promise<PaginatedResponseDto<Entity>> {
    const { page = 1, pageSize = 10, sortField, sortOrder = 'asc', search } = query;

    const where: any = {};

    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }

    let order: any = [['id', 'ASC']];
    if (sortField && this.allowedSortFields.includes(sortField)) {
      order = [[sortField, sortOrder.toUpperCase()]];
    }

    const offset = (page - 1) * pageSize;

    const { rows: items, count: total } = await this.entityModel.findAndCountAll({
      where,
      order,
      offset,
      limit: pageSize,
    });

    return new PaginatedResponseDto(items, total, page, pageSize);
  }

  async findOne(id: number): Promise<Entity> {
    const entity = await this.entityModel.findByPk(id);
    if (!entity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: UpdateEntityRequestDto): Promise<Entity> {
    const entity = await this.findOne(id);
    await entity.update({ ...dto, dateUpdate: DateUtil.now() });
    return entity;
  }

  async remove(id: number): Promise<void> {
    const entity = await this.findOne(id);
    await entity.destroy();
  }
}
```

---

## 9. Конфигурация

### 9.1 TypeScript — tsconfig.json

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2023",
    "declaration": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "paths": {
      "@/*": ["src/*"],
      "@modules/*": ["src/modules/*"],
      "@common/*": ["src/common/*"],
      "@config/*": ["src/config/*"]
    }
  }
}
```

**Ключевые решения:**
- `strictNullChecks: false` — Sequelize-модели плохо работают со strict null
- `experimentalDecorators + emitDecoratorMetadata` — обязательно для NestJS и Sequelize
- Path aliases `@/*` — чистые импорты вместо `../../..`

### 9.2 tsconfig.build.json

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "plan", "**/*spec.ts"]
}
```

### 9.3 tsconfig.migrations.json

Отдельный конфиг для компиляции миграций (в `dist-migrations/`):

```json
{
  "compilerOptions": {
    "outDir": "./dist-migrations",
    "module": "commonjs",
    "target": "es6",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "baseUrl": "./src"
  },
  "include": ["database/migrations/**/*", "database/seeders/**/*"]
}
```

### 9.4 nest-cli.json

```json
{
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      { "include": "modules/mail/templates/**/*.hbs", "outDir": "dist/src" }
    ],
    "watchAssets": true
  }
}
```

**Важно:** `assets` копирует Handlebars-шаблоны в dist при сборке.

### 9.5 ESLint (flat config)

```javascript
// eslint.config.mjs
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',        // Sequelize требует any
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
);
```

### 9.6 Prettier

```json
{ "singleQuote": true, "trailingComma": "all" }
```

---

## 10. База данных и миграции

### 10.1 Конфигурация Sequelize

```typescript
// src/config/database.config.ts
export const getDatabaseConfig = (configService: ConfigService) => ({
  dialect: 'mysql',
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  autoLoadModels: true,   // Автозагрузка моделей из модулей
  synchronize: false,      // Только миграции, никогда sync
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    timestamps: false,
  },
});
```

### 10.2 Sequelize CLI config

```javascript
// .sequelizerc
module.exports = {
  config: path.resolve('src/config', 'sequelize-cli.config.js'),
  'migrations-path': path.resolve('src/database', 'migrations'),
  'seeders-path': path.resolve('src/database', 'seeders'),
};
```

### 10.3 Миграции — формат

**Нейминг файлов:** `YYYYMMDD_HHMM_описание.ts`

```
20260311_0100_create_password_reset_tokens.ts
20260311_0200_add_email_verification.ts
```

Шаблон `YYYYMMDD` — дата, `HHMM` — порядковый номер (0100, 0200...).

**Формат миграции:**

```typescript
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('table_name', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',           // snake_case в БД
        references: {
          model: 'users',           // Ссылка на таблицу
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
    });

    // Индексы
    await queryInterface.addIndex('table_name', ['field'], {
      name: 'idx_table_field',
    });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('table_name');
  },
};
```

### 10.4 Скрипты миграций (package.json)

```json
{
  "build:migrations": "tsc --project tsconfig.migrations.json",
  "clean:migrations": "rm -rf dist-migrations",
  "db:migrate:up": "npm run clean:migrations && npm run build:migrations && ts-node --transpile-only ./node_modules/.bin/sequelize-cli db:migrate && npm run clean:migrations",
  "db:migrate:undo": "npm run clean:migrations && npm run build:migrations && ts-node --transpile-only ./node_modules/.bin/sequelize-cli db:migrate:undo && npm run clean:migrations"
}
```

**Пайплайн:** clean → build (в dist-migrations/) → run sequelize-cli → clean.

---

## 11. Логирование (Pino)

### 11.1 Конфигурация

```typescript
// app.module.ts
LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',    // Красивый вывод в dev
            options: { colorize: true, singleLine: true },
          }
        : {
            targets: [
              { target: 'pino/file', options: { destination: 1 } },  // stdout
              {
                target: 'pino-roll',   // Файлы с ежедневной ротацией
                options: { file: '/app/logs/app', frequency: 'daily', mkdir: true },
              },
            ],
          },
  },
});
```

### 11.2 Использование в сервисах

```typescript
import { Logger } from '@nestjs/common';

private readonly logger = new Logger(MyService.name);

this.logger.log('Info message');
this.logger.error('Error message', error.stack);
this.logger.warn('Warning');
this.logger.debug('Debug info');
```

### 11.3 Production: файлы логов

- Путь: `/app/logs/app.YYYY-MM-DD`
- Ротация: ежедневно
- Docker volume: `./logs:/app/logs`
- Формат: JSON (структурированные логи)

---

## 12. Даты (Luxon)

```typescript
import { DateUtil } from '@common/utils';

DateUtil.now();                          // Текущая Date
DateUtil.plusHours(1);                   // +1 час
DateUtil.plusDays(7);                    // +7 дней
DateUtil.format(date, 'dd.MM.yyyy');    // Форматирование
DateUtil.calculateAge(birthDate, onDate); // Возраст
DateUtil.isPast(date);                   // В прошлом?
DateUtil.isFuture(date);                 // В будущем?
```

**Правило:** Никогда не использовать `new Date()` напрямую. Только `DateUtil.now()`.

---

## 13. Аутентификация и авторизация

### 13.1 JWT

- Access-токен: 15 минут (по умолчанию)
- Refresh-токен: 7 дней
- Payload: `{ userId, typeUser }`

### 13.2 Guards

```typescript
@UseGuards(JwtAuthGuard)                          // Только авторизация
@UseGuards(JwtAuthGuard, RolesGuard)              // Авторизация + роль
@Roles(UserType.ADMIN)                            // Только админ
@Roles(UserType.ORGANIZER, UserType.ADMIN)        // Организатор или админ
```

### 13.3 Роли (UserType enum)

```typescript
export enum UserType {
  TRAINER = 1,
  JUDGE = 2,
  ORGANIZER = 4,
  ADMIN = 100,
}
```

Admin (`100`) имеет универсальный доступ через `RolesGuard`.

### 13.4 Текущий пользователь

```typescript
@CurrentUser() user: CurrentUserPayload    // { userId, typeUser }
@CurrentUser('userId') userId: number      // Только userId
```

---

## 14. Файлы

### 14.1 Двухэтапная загрузка

1. `POST /upload` → файл в `temp/` с UUID-именем
2. При сохранении entity → `FileService.moveFromTemp()` → `uploads/`

### 14.2 Хранилище

Переключается через env `STORAGE_TYPE`:
- `local` — локальная FS (`uploads/`)
- `s3` — S3/MinIO

---

## 15. Docker и деплой

### 15.1 Dockerfile (multi-stage)

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
COPY . .
RUN npm ci --legacy-peer-deps && npm run build

# Stage 2: Production
FROM node:22-alpine
COPY --from=builder /app/dist ./dist
RUN npm ci --legacy-peer-deps --only=production
CMD ["node", "dist/src/main"]
```

### 15.2 docker-compose.yml

```yaml
services:
  db:        # 
  backend:   # NestJS
  migrate:   # One-time миграции (profile: migrate)
```

### 15.3 Makefile

| Команда | Описание |
|---------|----------|
| `make deploy` | Полный деплой: build → upload → restart |
| `make build` | Docker build (linux/amd64) |
| `make logs` | Docker logs на сервере |
| `make logs-file` | Файловые логи на сервере |
| `make status` | Статус контейнеров |
| `make migrate-remote` | Миграции на сервере |
| `make dev` | Локальная разработка |

---

## 16. Переменные окружения

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=database_name

# JWT
JWT_SECRET=secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user
SMTP_PASS=pass
SMTP_FROM=noreply@example.com

# App
NODE_ENV=production
PORT=
LOG_LEVEL=info
LOG_DIR=/app/logs
CORS_ORIGIN=https://example.com
FRONTEND_URL=https://example.com

# Storage
STORAGE_TYPE=local
UPLOAD_DIR=uploads
TEMP_DIR=temp

# Encryption
ENCRYPTION_KEY=32-byte-hex-key

# Telegram
TELEGRAM_BOT_TOKEN=token
TELEGRAM_CHAT_ID=chat_id
```

---

## 17. Чеклист для нового проекта

При трансляции архитектуры на новый проект:

1. **Инициализация:**
   - [ ] `nest new project --strict` + переключить на Fastify
   - [ ] Настроить `tsconfig.json` с path aliases
   - [ ] Настроить `tsconfig.build.json`, `tsconfig.migrations.json`
   - [ ] Настроить `.sequelizerc`
   - [ ] Настроить `eslint.config.mjs` + `.prettierrc`
   - [ ] Настроить `nest-cli.json` (assets если нужно)

2. **Инфраструктура:**
   - [ ] `common/` — guards, decorators, dto, enums, utils, services
   - [ ] Database config + Sequelize Module
   - [ ] Pino logger (nestjs-pino)
   - [ ] DateUtil (Luxon)
   - [ ] Swagger setup в `main.ts`
   - [ ] Validation Pipe (whitelist, transform, forbidNonWhitelisted)

3. **Модули:**
   - [ ] Один reference-модуль как эталон (entity, dto, swagger, controller, service)
   - [ ] Auth-модуль (JWT + Passport + Roles)

4. **Деплой:**
   - [ ] Dockerfile (multi-stage)
   - [ ] docker-compose.yml
   - [ ] Makefile
   - [ ] `.env.example`

---

## 18. Зависимости для нового проекта

```bash
# Core
npm i @nestjs/common @nestjs/core @nestjs/platform-fastify
npm i @fastify/multipart @fastify/static

# Database
npm i @nestjs/sequelize sequelize sequelize-typescript mysql2

# Validation & Transformation
npm i class-validator class-transformer

# Auth
npm i @nestjs/passport @nestjs/jwt passport passport-jwt

# Swagger
npm i @nestjs/swagger

# Logging
npm i nestjs-pino pino-http pino-pretty pino-roll

# Config
npm i @nestjs/config

# Utils
npm i lodash luxon uuid bcrypt

# Dev
npm i -D typescript @nestjs/cli @nestjs/schematics
npm i -D eslint eslint-plugin-prettier eslint-config-prettier prettier
npm i -D ts-node tsconfig-paths sequelize-cli
npm i -D @types/node @types/lodash @types/luxon @types/bcrypt @types/passport-jwt
```
