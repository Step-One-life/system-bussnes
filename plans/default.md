# Правила кодирования

## 1. Lodash вместо нативных методов

Использовать lodash вместо нативных методов JavaScript:

| Нативный | Lodash | Импорт |
|----------|--------|--------|
| `.length` | `size()` | `import size from 'lodash/size'` |
| `.map()` | `map()` | `import map from 'lodash/map'` |
| `.filter()` | `filter()` | `import filter from 'lodash/filter'` |
| `.find()` | `find()` | `import find from 'lodash/find'` |
| `.forEach()` | `forEach()` | `import forEach from 'lodash/forEach'` |
| `.some()` | `some()` | `import some from 'lodash/some'` |
| `.every()` | `every()` | `import every from 'lodash/every'` |
| `.includes()` | `includes()` | `import includes from 'lodash/includes'` |
| `[0]` | `head()` | `import head from 'lodash/head'` |
| `.join()` | `join()` | `import join from 'lodash/join'` |
| `!== undefined`, `!== null` | `!isNil()` | `import isNil from 'lodash/isNil'` |
| `=== undefined`, `=== null` | `isNil()` | `import isNil from 'lodash/isNil'` |

Также использовать: `compact`, `get`, `isEmpty`, `sortBy`, `groupBy`, `trim`, `values`, `keys`

---

## 2. Структура сущности (entity)

```
src/entities/{entity-name}/
├── index.ts                    # Экспорт публичного API
├── list/                       # Список сущностей
│   ├── index.ts
│   ├── list.tsx               # Компонент списка
│   ├── config.tsx             # Конфигурация колонок
│   ├── models.ts              # Интерфейсы и типы
│   └── components/            # Вложенные компоненты
│       └── mobile-card.tsx
├── form/                       # Форма создания/редактирования
│   ├── index.ts
│   ├── form.tsx
│   ├── models.ts
│   └── components/
├── details/                    # Детальный просмотр
│   ├── index.ts
│   ├── details-modal.tsx
│   ├── models.ts
│   └── components/
└── {feature}/                  # Дополнительные фичи
    ├── index.ts
    ├── hooks/
    │   ├── index.ts
    │   └── useFeature.ts
    └── components/
        ├── index.ts
        └── FeatureComponent.tsx
```

---

## 3. Разделение файлов

### Максимальный размер файла: ~200-300 строк

Если файл превышает этот размер — рефакторить:

- **Логика** → выносить в хуки (`hooks/useXxx.ts`)
- **UI элементы** → выносить в компоненты (`components/XxxItem.tsx`)
- **Типы** → выносить в `models.ts`
- **Утилиты** → выносить в `utils.ts`

### Пример рефакторинга большого компонента:

```
До:  register-contest-modal.tsx (300+ строк)

После:
├── register-contest-modal.tsx  (80 строк) — чистый UI
├── hooks/
│   └── useRegisterContest.ts   (120 строк) — логика
└── components/
    └── command-list-item.tsx   (90 строк) — элемент списка
```

---

## 4. Импорты

### Порядок импортов:
1. React/библиотеки (`react`, `@tanstack/*`)
2. UI библиотеки (`mui`, иконки)
3. Lodash (каждый метод отдельно)
4. i18n, роутинг
5. Общие компоненты и хуки (`common/*`)
6. Локальные импорты (относительные пути)
7. Типы (`import type`)

### Абсолютные пути для entities:
```typescript
// ✅ Правильно
import type { ICommand } from 'entities/commands/list';

// ❌ Неправильно (глубокие относительные пути)
import type { ICommand } from '../../../commands/list/models';
```

---

## 5. Компоненты

### Чистые компоненты:
- Минимум логики внутри
- Логика выносится в хуки
- Props интерфейс рядом с компонентом или в `models.ts`

### Именование:
- Компоненты: `PascalCase` (`CommandListItem`)
- Хуки: `camelCase` с префиксом `use` (`useRegisterContest`)
- Файлы: `kebab-case` (`command-list-item.tsx`)

---

## 6. Хуки

### Когда создавать отдельный хук:
- Логика > 30 строк
- Используется в нескольких местах
- Включает API вызовы, состояние, эффекты

### Структура хука:
```typescript
interface UseXxxOptions {
  // входные параметры
}

interface UseXxxResult {
  // возвращаемые значения
}

export function useXxx(options: UseXxxOptions): UseXxxResult {
  // логика
  return { ... };
}
```

---

## 7. API и данные

### Типы ответов API:
```typescript
import type { ApiListResponse } from 'common/services/api/api.types';

// Для списков
const { data } = useQuery({
  queryFn: () => apiService.get<ApiListResponse<Item>>('items'),
});
const items = data?.items ?? [];
```

### Query keys:
```typescript
queryKey: ['entity-name', id]           // один элемент
queryKey: ['entity-name', 'all']        // весь список
queryKey: ['entity-name', id, 'extra']  // с доп. параметрами
```

---

## 8. Переводы (i18n)

- Все тексты через `t('key')`
- Ключи: `entity.section.key` (`contests.registration.title`)
- Добавлять в оба файла: `ru/translation.json` и `en/translation.json`

---

## 9. Стилизация

- Использовать Ant Design компоненты
- Inline стили для простых случаев
- CSS модули для сложной стилизации
- Избегать `!important`

