


CREATE TABLE v1_super_api_auth_request {
		CREATE COLUMN name VARCHAR;
		CREATE COLUMN password VARCHAR;
};
CREATE TABLE v1_super_api_auth_response {
		CREATE COLUMN code INTEGER;
		CREATE COLUMN token VARCHAR;
};
CREATE TABLE v1_super_api_sync_request {
		CREATE COLUMN operation INTEGER;
		CREATE COLUMN payload VARBINARY;
};
CREATE TABLE v1_super_api_sync_response {
		CREATE COLUMN operation INTEGER;
		CREATE COLUMN payload VARBINARY;
};
