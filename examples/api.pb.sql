


CREATE TABLE api_auth_request {
		CREATE COLUMN name VARCHAR;
		CREATE COLUMN password VARCHAR;
};
CREATE TABLE api_auth_response {
		CREATE COLUMN code INTEGER;
		CREATE COLUMN token VARCHAR;
};
CREATE TABLE api_sync_request {
		CREATE COLUMN operation INTEGER;
		CREATE COLUMN payload VARBINARY;
};
CREATE TABLE api_query_request {
		CREATE COLUMN id ;
		CREATE COLUMN filter VARCHAR;
};
CREATE TABLE api_query_response {
		CREATE COLUMN id ;
		CREATE COLUMN data VARCHAR;
};
CREATE TABLE api_mutation_request {
		CREATE COLUMN id ;
		CREATE COLUMN payload VARCHAR;
};
CREATE TABLE api_mutation_response {
		CREATE COLUMN id ;
		CREATE COLUMN payload VARCHAR;
};
