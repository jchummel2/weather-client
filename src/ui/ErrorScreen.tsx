export function ErrorScreen({ message }: { message: string }) {
  return <div style={{padding: 40 }}>Error: {message}</div>;
}