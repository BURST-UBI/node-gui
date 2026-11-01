use super::rpc_call;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

async fn server(responses: Vec<(u16, &'static str)>) -> (String, tokio::task::JoinHandle<usize>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    let task = tokio::spawn(async move {
        let count = responses.len();
        for (status, body) in responses {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = Vec::new();
            loop {
                let mut chunk = [0; 1024];
                let n = socket.read(&mut chunk).await.unwrap();
                assert!(n > 0);
                request.extend_from_slice(&chunk[..n]);
                if let Some(end) = request.windows(4).position(|part| part == b"\r\n\r\n") {
                    let headers = String::from_utf8_lossy(&request[..end]).to_ascii_lowercase();
                    let length: usize = headers
                        .lines()
                        .find_map(|line| line.strip_prefix("content-length: "))
                        .unwrap()
                        .parse()
                        .unwrap();
                    if request.len() >= end + 4 + length {
                        assert_eq!(
                            serde_json::from_slice::<serde_json::Value>(
                                &request[end + 4..end + 4 + length]
                            )
                            .unwrap(),
                            serde_json::json!({"action":"consti"})
                        );
                        break;
                    }
                }
            }
            let response = format!("HTTP/1.1 {status} Response\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
            socket.write_all(response.as_bytes()).await.unwrap();
        }
        count
    });
    (url, task)
}

#[tokio::test]
async fn transient_node_and_http_limits_recover_with_the_same_read() {
    let (url, requests) = server(vec![
        (200, r#"{"error":"rate limited"}"#),
        (429, "{}"),
        (200, r#"{"result":{"articles":[]}}"#),
    ])
    .await;
    let result = rpc_call(&url, serde_json::json!({"action":"consti"}))
        .await
        .unwrap();
    assert_eq!(result, serde_json::json!({"articles":[]}));
    assert_eq!(requests.await.unwrap(), 3);
}

#[tokio::test]
async fn persistent_admission_rejection_stops_after_four_attempts() {
    let (url, requests) = server(vec![(200, r#"{"error":"rate limited"}"#); 4]).await;
    assert_eq!(
        rpc_call(&url, serde_json::json!({"action":"consti"}))
            .await
            .unwrap_err(),
        "Node error: rate limited"
    );
    assert_eq!(requests.await.unwrap(), 4);
}

#[tokio::test]
async fn other_node_errors_are_not_retried() {
    let (url, requests) = server(vec![(200, r#"{"error":"store error: corrupt"}"#)]).await;
    assert_eq!(
        rpc_call(&url, serde_json::json!({"action":"consti"}))
            .await
            .unwrap_err(),
        "Node error: store error: corrupt"
    );
    assert_eq!(requests.await.unwrap(), 1);
}
