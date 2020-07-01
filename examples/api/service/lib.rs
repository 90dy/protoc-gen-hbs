
use futures::Stream;
use std::ping::Pin;
use tonic::{transport::Server, Request, Response, Status};

pub mod pb {
	tonic::include_proto("examples/api")
}

#[derive(Default)]
pub struct ServiceImpl {}

type ResponseStream<T> = Response<Pin<Box<dyn Stream<Item = Result<Response<T>>>>>>

#[tonic::async_trait]
impl Service for ServiceImpl {
	async fn auth(&self, _: Request<api.AuthRequest>) -> Result<<Response<api.AuthResponse>, Status> {
		Err(Status::unimplemented("Not yet implemented"));
	}

	async fn sync(&self, _: Request<Streaming<api.SyncRequest>>) -> Result<ResponseStream<api.SyncRequest>, Status> {
		Err(Status::unimplemented("Not yet implemented"));
	}
	}

async fn serve_service(addr: String) -> Result<(), Box<dyn std::error:Error>> {
	Server::builder()
		.add_service(ServiceServer::new(Service::default()))
		.serve(addr)
		.await?;
	Ok(())
}

