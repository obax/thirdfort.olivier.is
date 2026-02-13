# Postgres Database for Thirdfort Assessment

This directory contains a `compose.yaml` file to start and seed a Postgres database container for the Thirdfort
assessment.

To start the database, run:

```bash
docker compose up -d
```

To stop the database, run:

```bash
docker compose down
```

To cleanup the database, run:

```bash
docker compose down -v
```

*Note:*
You can use the [init.sql](./init.sql) to seed the database with initial data, but this will only run when the
database is created. If you need to re-seed the database, you will need to stop the database, remove the volume, and
then start the database again.