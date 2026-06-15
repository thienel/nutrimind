export * from './types';
export * from './sql/profile.sql';
export * from './sql/meal.sql';
export * from './sql/water.sql';
export * from './sql/weight.sql';
export * from './sql/sync-queue.sql';

import { SQL_CREATE_LOCAL_PROFILE } from './sql/profile.sql';
import {
  SQL_CREATE_LOCAL_MEAL_ENTRIES,
  SQL_IDX_MEAL_DATE,
  SQL_IDX_MEAL_SYNC,
} from './sql/meal.sql';
import {
  SQL_CREATE_LOCAL_WATER_ENTRIES,
  SQL_IDX_WATER_DATE,
  SQL_IDX_WATER_SYNC,
} from './sql/water.sql';
import {
  SQL_CREATE_LOCAL_WEIGHT_ENTRIES,
  SQL_IDX_WEIGHT_DATE,
  SQL_IDX_WEIGHT_SYNC,
} from './sql/weight.sql';
import {
  SQL_CREATE_SYNC_QUEUE,
  SQL_IDX_QUEUE_STATUS,
} from './sql/sync-queue.sql';

export const ALL_DDL: string[] = [
  SQL_CREATE_LOCAL_PROFILE,
  SQL_CREATE_LOCAL_MEAL_ENTRIES,
  SQL_IDX_MEAL_DATE,
  SQL_IDX_MEAL_SYNC,
  SQL_CREATE_LOCAL_WATER_ENTRIES,
  SQL_IDX_WATER_DATE,
  SQL_IDX_WATER_SYNC,
  SQL_CREATE_LOCAL_WEIGHT_ENTRIES,
  SQL_IDX_WEIGHT_DATE,
  SQL_IDX_WEIGHT_SYNC,
  SQL_CREATE_SYNC_QUEUE,
  SQL_IDX_QUEUE_STATUS,
];
