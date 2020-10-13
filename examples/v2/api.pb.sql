


CREATE TABLE v2_super_api_auth_request {
		CREATE COLUMN name VARCHAR;
		CREATE COLUMN password VARCHAR;
};
CREATE TABLE v2_super_api_auth_response {
		CREATE COLUMN code INTEGER;
		CREATE COLUMN token VARCHAR;
};
CREATE TABLE v2_super_api_sync_request {
		CREATE COLUMN operation INTEGER;
		CREATE COLUMN payload VARBINARY;
};
CREATE TABLE v2_super_api_query_request {
		CREATE COLUMN id ;
		CREATE COLUMN filter VARCHAR;
};
CREATE TABLE v2_super_api_query_response {
		CREATE COLUMN id ;
		CREATE COLUMN data VARCHAR;
};
CREATE TABLE v2_super_api_mutation_request {
		CREATE COLUMN id ;
		CREATE COLUMN payload VARCHAR;
};
CREATE TABLE v2_super_api_mutation_response {
		CREATE COLUMN id ;
		CREATE COLUMN payload VARCHAR;
};
