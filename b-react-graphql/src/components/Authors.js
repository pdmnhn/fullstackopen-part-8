import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { EDIT_AUTHOR, ALL_AUTHORS, ALL_BOOKS } from "../queries";

const EditAuthor = ({ result }) => {
  const [name, setName] = useState(result.data.allAuthors[0]?.name);
  const [born, setBorn] = useState("");

  const [editAuthor] = useMutation(EDIT_AUTHOR, {
    refetchQueries: [{ query: ALL_AUTHORS }, { query: ALL_BOOKS }],
  });

  if (result.loading) {
    return <div>loading...</div>;
  }

  const submit = (event) => {
    event.preventDefault();
    editAuthor({ variables: { name, born: Number(born) } });
    setName(result.data.allAuthors[0]?.name);
    setBorn("");
  };

  return (
    <div>
      <h2>Set birthyear</h2>
      <form onSubmit={submit}>
        <div>
          name
          <select
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
          >
            {result.data.allAuthors.map((author) => {
              return (
                <option key={author.id} value={author.name}>
                  {author.name}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          born
          <input
            value={born}
            type="number"
            onChange={(event) => {
              setBorn(event.target.value);
            }}
          />
        </div>
        <button type="submit">update author</button>
      </form>
    </div>
  );
};

const Authors = (props) => {
  const result = useQuery(ALL_AUTHORS);

  if (!props.show) {
    return null;
  }

  if (result.loading) {
    return <div>loading...</div>;
  }

  return (
    <div>
      <h2>authors</h2>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>born</th>
            <th>books</th>
          </tr>
          {result.data.allAuthors.map((a) => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td>{a.born}</td>
              <td>{a.bookCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <EditAuthor result={result} />
    </div>
  );
};

export default Authors;
