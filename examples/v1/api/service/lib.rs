
use futures::Stream;
use std::ping::Pin;
use tonic::{transport::Server, Request, Response, Status};

pub mod pb {
	tonic::include_proto("examples/v1/api")
}

#[derive(Default)]
pub struct ServiceImpl {}

type ResponseStream<T> = Response<Pin<Box<dyn Stream<Item = Result<Response<T>>>>>>

#[tonic::async_trait]
impl Service for ServiceImpl {
	async fn auth(&self, _: Request<v1.super.api.AuthRequest>) -> Result<<Response<v1.super.api.AuthResponse>, Status> {
		Err(Status::unimplemented("Not yet implemented"));
	}
	async fn sync(&self, _: Request<Streaming<v1.super.api.SyncRequest>>) -> Result<ResponseStream<v1.super.api.SyncResponse>, Status> {
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
