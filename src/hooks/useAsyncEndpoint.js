import React from "react";
import axios from "axios";

export const globalRequestConfig = {
  baseURL: "https://api.github.com/search"
};

// Origin: https://medium.com/@jaryd_34198/seamless-api-requests-with-react-hooks-part-2-3ab42ba6ad5c

/**
 * Define:
 * const [ { data: addressByIdResult }, getAddressById, cancel ] = useAsyncEndpoint({
 *   url: "/GetAddressById",
 *   method: "post"
 * });
 *
 * Use:
 *   getAddressById({ data: { AddressId: selectedItem.AddressId } });
 *
 *   cancel("Some cancel message here.....");
 *
 * @param {object} config Request Configuration
 */
export const useAsyncEndpointWithCancel = (config = {}) => {
  const reqConfig = React.useRef(config);
  const sourceRef = React.useRef(axios.CancelToken.source());

  const [res, setRes] = React.useState({
    data: undefined,
    headers: undefined,
    isComplete: false,
    isPending: false,
    statusCode: undefined,
    statusText: undefined,
    hasError: false,
    errorInfo: undefined
  });
  const [req, setReq] = React.useState();

  React.useEffect(() => {
    let isCleanup = false;

    const { cancel } = sourceRef.current;
    const reqEndpoint = async () => {
      setRes({
        data: undefined,
        headers: undefined,
        isPending: true,
        isComplete: false,
        statusCode: undefined,
        statusText: undefined,
        hasError: false,
        errorInfo: undefined
      });
      try {
        const result = await axios({
          ...globalRequestConfig,
          ...reqConfig.current,
          ...req,
          cancelToken: sourceRef.current.token
        });

        if (!isCleanup) {
          setRes(() => ({
            data: result.data,
            headers: result.headers,
            isPending: false,
            isComplete: true,
            statusCode: result.status,
            statusText: result.statusText,
            hasError: false,
            errorInfo: undefined
          }));
        }
      } catch (error) {
        const commonRes = {
          data: undefined,
          headers: undefined,
          isPending: false,
          hasError: true
        };

        if (!isCleanup) {
          if (axios.isCancel(error)) {
            setRes(() => ({
              ...commonRes,
              statusCode: "499", // Unoffical code: Client Closed Request before server responses -- Nginx
              statusText: "Canceled",
              errorInfo: error.message
            }));
          } else {
            setRes(() => ({
              ...commonRes,
              headers: error.response && error.response.headers,
              isComplete: true,
              statusCode: error.response && error.response.status,
              statusText: error.response && error.response.statusText,
              errorInfo: error.response
            }));
          }
        }
      } finally {
        sourceRef.current = axios.CancelToken.source();
      }
    };

    if (!req) return;

    if (!isCleanup) {
      reqEndpoint();
    }

    return () => {
      if (!isCleanup) {
        cancel("Unmount period, cancelled.");
        sourceRef.current = axios.CancelToken.source();
      }

      isCleanup = true;
    };
  }, [req]);

  return [res, setReq, sourceRef.current.cancel];
};
