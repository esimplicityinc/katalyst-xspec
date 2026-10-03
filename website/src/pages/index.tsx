import { Redirect } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

// The site has no landing page of its own; send the bare site URL to the docs.
export default function Home(): JSX.Element {
  return <Redirect to={useBaseUrl('/docs/')} />;
}
