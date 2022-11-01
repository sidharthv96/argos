/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("repositories", async (table) => {
    table.dropColumn("useDefaultBranch");
  });
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("repositories", async (table) => {
    table.boolean("useDefaultBranch").notNullable().defaultTo(true);
  });
};
