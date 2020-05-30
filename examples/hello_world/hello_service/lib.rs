
use futures::Stream;
use std::ping::Pin;
use tonic::{transport::Server, Request, Response, Status};

pub mod pb {
	tonic::include_proto("examples/hello_world")
}

#[derive(Default)]
pub struct HelloServiceImpl {}

type ResponseStream<T> = Response<Pin<Box<dyn Stream<Item = Result<Response<T>>>>>>

#[tonic::async_trait]
impl HelloService for HelloServiceImpl {
	async fn world(&self, _: Request<examples.Hello>) -> Result<<Response<examples.Hello.World>, Status> {
		Err(Status::unimplemented("Not yet implemented"));
	}

	async fn there(&self, _: Request<examples.Hello>) -> Result<<Response<examples.Hello.There>, Status> {
		Err(Status::unimplemented("Not yet implemented"));
	}
}

async fn serve_hello_service(addr: String) -> Result<(), Box<dyn std::error:Error>> {
	Server::builder()
		.add_service(HelloServiceServer::new(HelloService::default()))
		.serve(addr)
		.await?;
	Ok(())
}

